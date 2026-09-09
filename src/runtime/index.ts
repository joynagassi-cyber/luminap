/**
 * Minimal Runtime — load and orchestrate capabilities
 *
 * The runtime is responsible for:
 * - Loading the manifest
 * - Resolving capability dependencies
 * - Coordinating capability calls
 * - Managing the application lifecycle
 */

import type { Manifest } from './compiler';

export interface Capability {
  name: string;
  init?(manifest: Manifest): Promise<void>;
  destroy?(): Promise<void>;
}

export class MinimalRuntime {
  private capabilities: Map<string, Capability> = new Map();
  private manifest: Manifest | null = null;
  private initialized = false;

  /** Register a capability */
  register(capability: Capability): void {
    this.capabilities.set(capability.name, capability);
  }

  /** Load a manifest and initialize capabilities */
  async load(manifest: Manifest): Promise<void> {
    this.manifest = manifest;
    this.initialized = true;

    // Initialize all capabilities
    for (const [name, capability] of this.capabilities) {
      if (manifest.capabilities.includes(name) && capability.init) {
        await capability.init(manifest);
      }
    }
  }

  /** Start the runtime */
  async start(): Promise<void> {
    if (!this.manifest) {
      throw new Error('Runtime not loaded. Call load() first.');
    }
    // Runtime started — capabilities are initialized
  }

  /** Shutdown the runtime */
  async shutdown(): Promise<void> {
    for (const [name, capability] of this.capabilities) {
      if (capability.destroy) {
        await capability.destroy();
      }
    }
    this.initialized = false;
  }

  /** Get a capability by name */
  getCapability(name: string): Capability | null {
    return this.capabilities.get(name) ?? null;
  }

  /** Check if runtime is initialized */
  isInitialized(): boolean {
    return this.initialized;
  }

  /** Get current manifest */
  getManifest(): Manifest | null {
    return this.manifest;
  }
}

/** Singleton instance */
export const runtime = new MinimalRuntime();
