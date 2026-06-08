// src/app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { headers } from 'next/headers';
import crypto from 'crypto';

const webhookSchema = z.object({
  event: z.string(),
  data: z.any(),
  timestamp: z.string().datetime(),
});

// Supported webhook events
type WebhookEvent = 
  | 'task.created'
  | 'task.updated'
  | 'task.completed'
  | 'project.created'
  | 'project.updated'
  | 'comment.added'
  | 'member.added'
  | 'member.removed';

// Webhook verification
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// POST /api/webhook - Receive webhook events
export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const signature = headersList.get('x-webhook-signature');
    const webhookSecret = process.env.WEBHOOK_SECRET;
    
    // Verify webhook signature in production
    if (webhookSecret && process.env.NODE_ENV === 'production') {
      if (!signature) {
        return NextResponse.json(
          { success: false, error: 'Missing webhook signature' },
          { status: 401 }
        );
      }
      
      const payload = await request.text();
      const isValid = verifyWebhookSignature(payload, signature, webhookSecret);
      
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    }
    
    const body = await request.json();
    const validatedData = webhookSchema.parse(body);
    
    const { event, data, timestamp } = validatedData;
    
    // Process different webhook events
    switch (event as WebhookEvent) {
      case 'task.created':
        await handleTaskCreated(data);
        break;
      case 'task.updated':
        await handleTaskUpdated(data);
        break;
      case 'task.completed':
        await handleTaskCompleted(data);
        break;
      case 'project.created':
        await handleProjectCreated(data);
        break;
      case 'project.updated':
        await handleProjectUpdated(data);
        break;
      case 'comment.added':
        await handleCommentAdded(data);
        break;
      case 'member.added':
        await handleMemberAdded(data);
        break;
      case 'member.removed':
        await handleMemberRemoved(data);
        break;
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }
    
    // Log webhook receipt
    await prisma.activityLog.create({
      data: {
        action: 'WEBHOOK_RECEIVED',
        entityType: 'webhook',
        entityId: event,
        metadata: {
          event,
          receivedAt: new Date().toISOString(),
          eventTimestamp: timestamp,
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Webhook event handlers
async function handleTaskCreated(data: any) {
  console.log(`Task created: ${data.taskId}`);
  // Implement custom logic (e.g., send to external CRM, Slack, etc.)
}

async function handleTaskUpdated(data: any) {
  console.log(`Task updated: ${data.taskId}`);
  // Implement custom logic
}

async function handleTaskCompleted(data: any) {
  console.log(`Task completed: ${data.taskId}`);
  // Implement custom logic (e.g., trigger CI/CD, update external systems)
}

async function handleProjectCreated(data: any) {
  console.log(`Project created: ${data.projectId}`);
  // Implement custom logic
}

async function handleProjectUpdated(data: any) {
  console.log(`Project updated: ${data.projectId}`);
  // Implement custom logic
}

async function handleCommentAdded(data: any) {
  console.log(`Comment added: ${data.commentId}`);
  // Implement custom logic (e.g., notify external system)
}

async function handleMemberAdded(data: any) {
  console.log(`Member added: ${data.userId} to project ${data.projectId}`);
  // Implement custom logic (e.g., sync with HR system)
}

async function handleMemberRemoved(data: any) {
  console.log(`Member removed: ${data.userId} from project ${data.projectId}`);
  // Implement custom logic
}

// GET /api/webhook - Get webhook configuration (for debugging)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      supportedEvents: [
        'task.created',
        'task.updated',
        'task.completed',
        'project.created',
        'project.updated',
        'comment.added',
        'member.added',
        'member.removed',
      ],
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`,
      requiresSignature: !!process.env.WEBHOOK_SECRET,
    },
  });
}

// POST /api/webhook/register - Register a webhook endpoint
export async function POST_register(request: NextRequest) {
  try {
    const { url, events, secret } = await request.json();
    
    // Store webhook registration in database
    const webhook = await prisma.webhookSubscription.upsert({
      where: { url },
      update: {
        events,
        secret,
        updatedAt: new Date(),
      },
      create: {
        url,
        events,
        secret,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: webhook,
      message: 'Webhook registered successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to register webhook' },
      { status: 500 }
    );
  }
}

// DELETE /api/webhook/unregister - Unregister a webhook endpoint
export async function DELETE_unregister(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    await prisma.webhookSubscription.delete({
      where: { url },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Webhook unregistered successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to unregister webhook' },
      { status: 500 }
    );
  }
}