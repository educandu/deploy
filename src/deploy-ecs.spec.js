import deployEcs from './deploy-ecs.js';
import { describe, expect, it } from 'vitest';

describe('deploy-ecs', () => {
  it('should export the deployEcs function', () => {
    expect(deployEcs).toBeTypeOf('function');
  });
});
