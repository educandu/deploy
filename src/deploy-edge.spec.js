import deployEdge from './deploy-edge.js';
import { describe, expect, it } from 'vitest';

describe('deploy-edge', () => {
  it('should export the deployEdge function', () => {
    expect(deployEdge).toBeTypeOf('function');
  });
});
