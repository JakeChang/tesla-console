/** JSON-RPC 2.0 回應格式 */
export function jsonRpcResponse(id: any, result: any) {
  return { jsonrpc: '2.0', id, result }
}

export function jsonRpcError(id: any, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}
