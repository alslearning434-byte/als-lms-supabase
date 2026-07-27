import { useState, useRef } from "react"

export default function ImageCarousel({ images }: { images: { src: string; alt: string }[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, scrollLeft: 0 })

  const updateActive = () => {
    const el = scrollRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / el.offsetWidth)
    setActiveIdx(Math.min(idx, images.length - 1))
  }

  const scrollTo = (idx: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: idx * el.offsetWidth, behavior: "smooth" })
    setActiveIdx(idx)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    dragStart.current = { x: e.clientX, scrollLeft: scrollRef.current?.scrollLeft || 0 }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !scrollRef.current) return
    const dx = e.clientX - dragStart.current.x
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx
  }
  const onPointerUp = () => { setIsDragging(false); updateActive() }

  if (images.length === 0) return null

  return (
    <div className="relative mt-3 group">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory rounded-xl border border-gray-100 bg-gray-50 scroll-smooth select-none"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        onScroll={updateActive}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {images.map((img, i) => (
          <div key={i} className="snap-center shrink-0 w-full flex items-center justify-center p-3" style={{ minHeight: 200 }}>
            <img src={img.src} alt={img.alt || ""} className="max-w-full max-h-80 rounded-lg object-contain pointer-events-none" draggable={false} />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            onClick={() => scrollTo(Math.max(0, activeIdx - 1))}
            className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-600 hover:bg-white transition opacity-0 group-hover:opacity-100 ${activeIdx === 0 ? "pointer-events-none" : ""}`}
          >
            <i className="fas fa-chevron-left text-xs" />
          </button>
          <button
            onClick={() => scrollTo(Math.min(images.length - 1, activeIdx + 1))}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-600 hover:bg-white transition opacity-0 group-hover:opacity-100 ${activeIdx === images.length - 1 ? "pointer-events-none" : ""}`}
          >
            <i className="fas fa-chevron-right text-xs" />
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === activeIdx ? "bg-navy-500 w-4" : "bg-gray-300"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
