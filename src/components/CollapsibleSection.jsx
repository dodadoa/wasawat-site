import React from "react"
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react"

const CollapsibleSection = ({ title, children, defaultOpen = false, level = 2 }) => {
  const HeadingTag = level === 2 ? 'h2' : 'h3'
  const headingClass = level === 2 
    ? "font-light text-2xl" 
    : "font-light lg:text-xl text-lg"

  return (
    <Disclosure defaultOpen={defaultOpen} as="div" className={level === 2 ? "mb-4" : "mb-2"}>
      {({ open }) => (
        <>
          <DisclosureButton 
            as="button" 
            className={`w-full text-left flex items-center justify-between border border-white p-4 h-[60px] cursor-pointer transition-colors duration-300 hover:bg-gradient-to-r hover:from-green-500/20 hover:via-green-400/30 hover:to-green-500/20 hover:border-green-400 ${
              level === 3 ? "ml-4" : ""
            }`}
          >
            <div className="flex-1 min-w-0">
              {React.createElement(HeadingTag, { className: `${headingClass} truncate` }, title)}
            </div>
            <span className="text-xl ml-4 flex-shrink-0 w-6 h-6 flex items-center justify-center">{open ? "−" : "+"}</span>
          </DisclosureButton>
          <DisclosurePanel className={
            level === 2 
              ? "mt-2 pl-4 border-l-2 border-white/50" 
              : level === 3 
              ? "mt-2 ml-4 pl-4 pr-4 py-2 border-l border-white/30 bg-black/20" 
              : "mt-2"
          }>
            {children}
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  )
}

export default CollapsibleSection

