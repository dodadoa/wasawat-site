import { useState } from "react"

const CollapsibleSection = ({ title, children, defaultOpen = false, level = 2 }) => {
  const [open, setOpen] = useState(defaultOpen)
  const HeadingTag = level === 2 ? "h2" : "h3"
  const headingClass = level === 2 ? "font-light text-2xl" : "font-light lg:text-xl text-lg"

  return (
    <div className={level === 2 ? "mb-4" : "mb-2"}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`relative z-10 w-full text-left flex items-center justify-between border p-2 cursor-pointer ${
          level === 3 ? "ml-4" : ""
        }`}
        style={{ borderColor: "var(--border)", color: "var(--text-body)" }}
      >
        <div className="flex-1 min-w-0">
          <HeadingTag className={`${headingClass} truncate`}>{title}</HeadingTag>
        </div>
        <span className="text-xl ml-4 flex-shrink-0 w-6 h-6 flex items-center justify-center">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div
          className={
            level === 2
              ? "mt-2 pl-4 border-l-2"
              : level === 3
                ? "mt-2 ml-4 pl-4 pr-4 py-2 border-l"
                : "mt-2"
          }
          style={
            level === 2
              ? { borderColor: "var(--border)" }
              : level === 3
                ? { borderColor: "var(--border)", background: "var(--bg-elevated)" }
                : undefined
          }
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default CollapsibleSection
