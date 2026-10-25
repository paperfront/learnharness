import { ClientPage } from "@/components/client-page";
export default async function NewPage({ searchParams }: { searchParams: Promise<{mode?: string}> }) { const {mode} = await searchParams; return <ClientPage path="/chat/new" search={new URLSearchParams(mode ? {mode} : {}).toString()} />; }
