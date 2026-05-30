export interface SearchResult {
  title: string
  url: string
  content: string
}

export interface SearchContext {
  query: string
  answer: string
  results: SearchResult[]
}

interface TavilyResult {
  title?: string
  url?: string
  content?: string
}

interface TavilyResponse {
  answer?: string
  results?: TavilyResult[]
}

const SEARCH_INTENT_PATTERN =
  /(最新|现在|今天|今年|调研|搜索|查一下|资料|来源|引用|链接|新闻|价格|数据|趋势|竞品|对比|current|latest|research|search|source|news|price|trend)/i

export function shouldSearchWeb(userInput: string): boolean {
  return SEARCH_INTENT_PATTERN.test(userInput)
}

export async function searchWeb(userInput: string, apiKey: string): Promise<SearchContext | null> {
  const trimmedApiKey = apiKey.trim()

  if (!trimmedApiKey || !shouldSearchWeb(userInput)) {
    return null
  }

  let response: Response
  try {
    response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: trimmedApiKey,
        query: userInput,
        search_depth: 'basic',
        include_answer: true,
        max_results: 5,
      }),
    })
  } catch {
    throw new Error('搜索失败：网络错误，请检查网络连接。')
  }

  if (!response.ok) {
    throw new Error(`搜索失败：Tavily 返回 ${response.status}。`)
  }

  let data: TavilyResponse
  try {
    data = (await response.json()) as TavilyResponse
  } catch {
    throw new Error('搜索失败：Tavily 返回了无效的响应格式。')
  }
  const results = (data.results ?? [])
    .filter((result) => result.title && result.url)
    .slice(0, 5)
    .map((result) => ({
      title: result.title ?? 'Untitled source',
      url: result.url ?? '',
      content: result.content ?? '',
    }))

  return {
    query: userInput,
    answer: data.answer ?? '',
    results,
  }
}

export function formatSearchContext(context: SearchContext | null): string {
  if (!context) {
    return ''
  }

  const sources = context.results
    .map((result, index) => {
      const content = result.content.replace(/\s+/g, ' ').slice(0, 500)

      return [`[${index + 1}] ${result.title}`, `URL: ${result.url}`, `Snippet: ${content}`].join('\n')
    })
    .join('\n\n')

  return [
    'Web search context:',
    `Query: ${context.query}`,
    context.answer ? `Answer summary: ${context.answer}` : '',
    sources ? `Sources:\n${sources}` : 'Sources: none',
  ]
    .filter(Boolean)
    .join('\n')
}
