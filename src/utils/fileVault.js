// A globally accessible Map to hold non-serializable File objects outside of Redux.
// Key: jobId (String) -> Value: Array of File objects
export const fileVault = new Map();