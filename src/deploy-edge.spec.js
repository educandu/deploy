import deployEdge from './deploy-edge.js';
import { describe, expect, it } from 'vitest';

describe('deploy-edge', () => {
  it('should export the edge command', () => {
    expect(deployEdge.command).toBe('edge');
  });
});
