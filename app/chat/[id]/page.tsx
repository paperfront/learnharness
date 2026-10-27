import { ClientPage } from "@/components/client-page";
export default async function ChatPage({ params, searchParams }: { params: Promise<{id: string}>; searchParams: Promise<{prompt?: string}> }) { const [{id},{prompt}] = await Promise.all([params,searchParams]); return <ClientPage path={`/chat/${encodeURIComponent(id)}`} search={new URLSearchParams(prompt ? {prompt} : {}).toString()} />; }
