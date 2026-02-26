export type ApiResponse = {
	message: string
	success: true
}

export type ConnectRequest = {
	token: string
	subdomain: string
	instanceName: string
}

export type ConnectResponse = {
	success: boolean
	qrCode?: string
	base64?: string
	status?: string
	message?: string
}

export type InstanceStatus = 'open' | 'connecting' | 'close' | 'qr' | 'unknown'

export type StatusResponse = {
	success: boolean
	status: InstanceStatus
	message?: string
}
