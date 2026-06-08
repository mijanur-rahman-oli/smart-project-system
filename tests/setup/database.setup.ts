// tests/setup/database.setup.ts
import { DatabaseFixture } from '@/tests/fixtures/database.fixture';

let fixture: DatabaseFixture;

beforeAll(async () => {
  fixture = new DatabaseFixture();
  await fixture.setup();
});

afterAll(async () => {
  await fixture.teardown();
});

export { fixture };