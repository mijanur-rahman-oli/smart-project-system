import React from 'react';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';

interface MentionSuggestionProps {
  items: Array<{ id: string; label: string }>;
  command: (props: { id: string; label: string }) => void;
  selectedIndex: number;
}

const MentionList = ({ items, command, selectedIndex }: MentionSuggestionProps) => {
  return (
    <div className="bg-popover rounded-md border shadow-md p-1 max-h-48 overflow-y-auto">
      {items.map((item, index) => (
        <button
          key={item.id}
          className={`w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-muted transition-colors ${
            index === selectedIndex ? 'bg-muted' : ''
          }`}
          onClick={() => command({ id: item.id, label: item.label })}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export const suggestion = {
  items: ({ query }: { query: string }) => {
    const users = [
      { id: '1', label: 'John Doe' },
      { id: '2', label: 'Jane Smith' },
      { id: '3', label: 'Mike Johnson' },
    ];
    return users
      .filter(user => user.label.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 5);
  },

  render: () => {
    let component: any;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: any) {
        component.updateProps(props);
        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }
        return component.ref?.onKeyDown(props);
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
};
