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

export type CrmProvisionRequest = {
	nome: string
	linkNotion: string
}

export type CrmProvisionStep =
	| 'validation'
	| 'supabase_insert'
	| 'uazapi_instance'
	| 'uazapi_webhook'
	| 'n8n_workflow_create'
	| 'n8n_workflow_activate'

export type CrmProvisionResponse = {
	success: boolean
	qrLink?: string
	contaId?: string
	failedStep?: CrmProvisionStep
	completed?: CrmProvisionStep[]
	error?: string
}

export type ClientSummary = {
	id: string
	nome: string
	notionLink: string | null
	whatsappStatus: InstanceStatus
	qrLink: string | null
	workflowActive: boolean | null
}

export type ClientsResponse = {
	success: boolean
	clients: ClientSummary[]
	error?: string
}

export type DeleteClientResponse = {
	success: boolean
	deleted: { instance: boolean; workflow: boolean; conta: boolean }
	error?: string
}


