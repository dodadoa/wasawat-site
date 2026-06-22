import { useState } from "react"

const linkClass =
  "text-[#737373] hover:text-[#e8e8e8] hover:no-underline uppercase text-[11px] tracking-widest flex flex-col align-middle cursor-pointer"

const Navigator = () => {
  const [openHamburger, setOpenhamburger] = useState(false)

  return (
    <nav className="fixed z-[100] top-0 flex flex-row justify-between h-16 w-full font-mono font-normal bg-black border-b border-[#1a1a1a] pointer-events-auto">
      <div className="p-4 pl-6 bg-black">
        <a href="/" className="text-[#e8e8e8] hover:text-white hover:no-underline text-[11px] tracking-widest uppercase">
          ~/giang
        </a>
      </div>
      <div className="lg:hidden">
        <div
          className="py-6 px-3 w-10 break-all leading-[6px] text-[#737373] cursor-pointer uppercase text-[11px]"
          onClick={() => setOpenhamburger(true)}
        >
          menu
        </div>
      </div>
      {openHamburger && (
        <>
          <div
            className="lg:hidden absolute top-0 right-0 p-2 py-4 w-10 h-10 text-[#737373] z-10 cursor-pointer text-[11px] uppercase"
            onClick={() => setOpenhamburger(false)}
          >
            x
          </div>
          <div className="lg:hidden absolute top-16 w-full bg-black border-b border-[#262626] flex flex-col p-4 gap-3">
            <a href="/art">
              <span className="text-[#737373] uppercase text-[11px] tracking-widest">/art</span>
            </a>
            <a href="/about">
              <span className="text-[#737373] uppercase text-[11px] tracking-widest">/about</span>
            </a>
          </div>
        </>
      )}

      <div className="lg:flex lg:flex-row lg:justify-between lg:mr-6 hidden">
        <a href="/art" className={linkClass}>
          <span className="m-4">/art</span>
        </a>
        <a href="/about" className={linkClass}>
          <span className="m-4">/about</span>
        </a>
      </div>
    </nav>
  )
}

export default Navigator
