import { NoteEditor } from './components/NoteEditor'

function App() {
  return (
    <div className="min-h-screen bg-[#1c2128] text-[#adbac7] font-mono p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#22272e] rounded-lg overflow-hidden shadow-xl border border-[#444c56]">
          {/* Terminal Header */}
          <div className="bg-[#2d333b] px-4 py-2 flex items-center gap-2">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#f47067]"></div>
              <div className="w-3 h-3 rounded-full bg-[#c69026]"></div>
              <div className="w-3 h-3 rounded-full bg-[#58a6ff]"></div>
            </div>
            <div className="flex-1 text-center text-sm text-[#768390]">
              noteme ~ /usr/local/bin/note
            </div>
          </div>
          
          {/* Terminal Content */}
          <div className="p-4">
            <NoteEditor />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
