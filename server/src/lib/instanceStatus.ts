export type InstanceStatus =
  | "open"
  | "connecting"
  | "close"
  | "qr"
  | "unknown";

// Mapeia o estado bruto retornado pela uazapi para o enum interno.
const stateMap: Record<string, InstanceStatus> = {
  open: "open",
  connected: "open",
  connecting: "connecting",
  close: "close",
  closed: "close",
  disconnected: "close",
  qr: "qr",
};

export function mapInstanceStatus(rawState: string | undefined): InstanceStatus {
  if (!rawState) return "unknown";
  return stateMap[rawState.toLowerCase()] ?? "unknown";
}
