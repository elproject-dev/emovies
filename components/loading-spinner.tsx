export function LoadingSpinner({ text = "Loading" }: { text?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[100vh] h-full w-full animate-in fade-in duration-500 bg-[#0a0a0a]">
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute w-16 h-16 border-4 border-green-500/30 border-t-green-500 border-b-green-500 rounded-full animate-spin shadow-[0_0_15px_rgba(34,197,94,0.3)]"></div>
        <div className="absolute w-12 h-12 border-4 border-green-400/30 border-l-green-400 border-r-green-400 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
        <div className="w-6 h-6 bg-green-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.8)]"></div>
      </div>
      <p className="text-green-500/90 mt-2 font-medium tracking-widest text-xs uppercase animate-pulse">{text}</p>
    </div>
  )
}
