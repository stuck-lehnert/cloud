export function assert(condition: unknown, message?: string): asserts condition {
    if (!!condition) return;
    if (message) throw new Error(`assertion failed: ${message}`);
    throw new Error('assertion failed');
}