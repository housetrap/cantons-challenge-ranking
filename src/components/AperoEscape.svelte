<svelte:options customElement="apero-escape-chart" />

<script lang="ts">
  // Vite natively loads this file as a raw string because of '?inline'
  import tailwindStyles from '../tailwind.css?inline'
  import { onMount } from 'svelte'

  const flags = import.meta.glob('../assets/flags/*.svg', {
    eager: true,
  }) as Record<string, { default: string }>

  const flagByCode = Object.fromEntries(
    Object.entries(flags).map(([path, mod]) => {
      const fileName = path.split('/').pop()?.replace('.svg', '') ?? ''
      const shortCode = fileName.replace('-coa', '')
      return [shortCode, mod.default]
    }),
  ) as Record<string, string>

  export let cantons: string = 'FR,VD,VS'
  let votes: Record<string, number> = {}

  type CountersResponse = {
    counters: Record<string, number>
  }

  type StreamPayload = {
    counters?: Record<string, number>
    [key: string]: unknown
  }

  function getSortedVotes(voteMap: Record<string, number>): [string, number][] {
    return Object.entries(voteMap).sort(
      ([, leftValue], [, rightValue]) => rightValue - leftValue,
    )
  }

  function getFilteredVotes(
    voteMap: Record<string, number>,
    cantonList: string,
  ): Record<string, number> {
    const allowedCantons = cantonList
      .split(',')
      .map((canton) => canton.trim().toUpperCase())
      .filter(Boolean)

    if (allowedCantons.length === 0) {
      return voteMap
    }

    return Object.fromEntries(
      Object.entries(voteMap).filter(([code]) => allowedCantons.includes(code)),
    )
  }

  function getRelativeBarHeight(
    value: number,
    voteMap: Record<string, number>,
    maxHeight: number = 320,
  ): number {
    const maxValue = Math.max(...Object.values(voteMap), 0)

    if (maxValue === 0) {
      return 0
    }

    return (value / maxValue) * maxHeight
  }

  function getFrenchRankLabel(rank: number): string {
    return `${rank}e`
  }

  async function loadVotes(): Promise<void> {
    const response = await fetch('https://api.aperoescape.ch/dc/v1/counters')
    const data = (await response.json()) as CountersResponse
    votes = data.counters
  }

  function applyStreamPayload(payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      return
    }

    const data = payload as StreamPayload

    if (data.counters && typeof data.counters === 'object') {
      votes = data.counters
    }
  }

  function connectVotesStream(): () => void {
    let socket: WebSocket | null = null
    let reconnectTimer: number | null = null
    let isDisposed = false

    const connect = (): void => {
      socket = new WebSocket('wss://api.aperoescape.ch/dc/v1/counters/stream')

      socket.addEventListener('message', (event) => {
        try {
          const payload = JSON.parse(event.data)
          applyStreamPayload(payload)
        } catch {
          // Ignore malformed messages from stream.
        }
      })

      socket.addEventListener('close', () => {
        if (isDisposed) {
          return
        }

        reconnectTimer = window.setTimeout(connect, 2000)
      })
    }

    connect()

    return () => {
      isDisposed = true

      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer)
      }

      socket?.close()
    }
  }

  onMount(() => {
    void loadVotes()

    return connectVotesStream()
  })

  let filteredVotes: Record<string, number> = {}
  let voteEntries: [string, number][] = []

  $: filteredVotes = getFilteredVotes(votes, cantons)
  $: voteEntries = getSortedVotes(filteredVotes)
</script>

<svelte:element this={'style'}>
  {@html tailwindStyles}
</svelte:element>

<!-- Use Tailwind classes normally -->
<div class="rounded-lg bg-red-950 p-6 text-white shadow">
  <div class="flex min-h-64 items-start gap-4">
    {#each voteEntries as [code, value], index}
      <div class="flex h-104 flex-col items-center gap-3">
        <div class="rounded-md border bg-red-900 p-2">
          <img
            src={flagByCode[code]}
            alt={`Flag of ${code}`}
            class="h-16 w-16 object-contain"
          />
        </div>
        <p class="text-sm font-medium text-red-200">{code}</p>
        <div class="h-1 w-16 rounded bg-red-50/90"></div>
        <div class="flex flex-col items-center gap-0.5">
          <p class="text-lg font-medium text-red-200">{value}</p>
          <p class="text-sm font-medium text-red-200">
            {value < 2 ? 'Point' : 'Points'}
          </p>
        </div>
        <div
          class="relative flex h-80 w-18 items-end overflow-hidden rounded-md border border-red-200/50 bg-red-900/40"
          title={`${code}: ${value}`}
        >
          <div
            class="w-full bg-amber-500"
            style={`height: ${getRelativeBarHeight(value, filteredVotes, 240)}px`}
          ></div>
        </div>
        <p class="mt-auto text-sm font-medium text-red-200">
          {getFrenchRankLabel(index + 1)}
        </p>
      </div>
    {/each}
  </div>
</div>
