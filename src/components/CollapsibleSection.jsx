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
        className={`relative z-10 w-full text-left flex items-center justify-between border border-neutral-700 p-2 cursor-pointer transition-colors duration-300 hover:bg-neutral-900 hover:border-neutral-600 ${
          level === 3 ? "ml-4" : ""
        }`}
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
              ? "mt-2 pl-4 border-l-2 border-neutral-800"
              : level === 3
                ? "mt-2 ml-4 pl-4 pr-4 py-2 border-l border-neutral-800 bg-neutral-900"
                : "mt-2"
          }
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default CollapsibleSection
