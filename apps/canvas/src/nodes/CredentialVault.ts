import { ProviderId } from './NodeShell.types'

const VAULT_KEY = 'node-shell-vault'
const MASK = '••••••••'

interface VaultData {
  [key: string]: {
    masked: string
    lastUpdated: number
  }
}

function getVault(): VaultData {
  try {
    const stored = localStorage.getItem(VAULT_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveVault(data: VaultData): void {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(data))
  } catch {
    console.error('Failed to save to vault')
  }
}

export function vaultSave(providerId: ProviderId, _apiKey: string): void {
  const vault = getVault()
  vault[`${providerId}_apiKey`] = {
    masked: MASK,
    lastUpdated: Date.now(),
  }
  saveVault(vault)
}

export function vaultGet(providerId: ProviderId): string {
  const vault = getVault()
  const key = vault[`${providerId}_apiKey`]
  return key?.masked ?? ''
}

export function vaultHas(providerId: ProviderId): boolean {
  const vault = getVault()
  return `${providerId}_apiKey` in vault
}

export function vaultClear(providerId: ProviderId): void {
  const vault = getVault()
  delete vault[`${providerId}_apiKey`]
  saveVault(vault)
}

export function vaultEdit(providerId: ProviderId): void {
  vaultClear(providerId)
}