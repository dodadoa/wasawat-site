import { useEffect, useState } from "react"

const linkClass =
  "hover:no-underline uppercase text-[13px] tracking-widest flex flex-col align-middle cursor-pointer"
const linkStyle = { color: "var(--text-muted)" }

function readPathSuffix() {
  const pathname = window.location.pathname.replace(/\/$/, "") || "/"
  if (pathname === "/") return ""
  return pathname
}

const Navigator = () => {
  const [openHamburger, setOpenhamburger] = useState(false)
  const [pathSuffix, setPathSuffix] = useState(() =>
    typeof window !== "undefined" ? readPathSuffix() : "",
  )

  useEffect(() => {
    const update = () => setPathSuffix(readPathSuffix())
    update()
    window.addEventListener("popstate", update)
    return () => window.removeEventListener("popstate", update)
  }, [])

  return (
    <nav
      className="fixed z-[100] top-0 flex flex-row justify-between h-10 w-full font-mono font-normal bg-black pointer-events-auto"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="p-2 pl-6 bg-black flex items-center">
        <a
          href="/"
          className="hover:no-underline text-[13px] tracking-widest uppercase"
          style={{ color: "var(--text)" }}
        >
          ~/giang
          {pathSuffix && (
            <span style={{ color: "var(--text-muted)" }}>{pathSuffix}</span>
          )}
        </a>
      </div>
      <div className="lg:hidden">
        <div
          className="py-3 px-3 w-10 break-all leading-[6px] cursor-pointer uppercase text-[13px]"
          style={{ color: "var(--text-muted)" }}
          onClick={() => setOpenhamburger(true)}
        >
          menu
        </div>
      </div>
      {openHamburger && (
        <>
          <div
            className="lg:hidden absolute top-0 right-0 p-2 py-4 w-10 h-10 z-10 cursor-pointer text-[13px] uppercase"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setOpenhamburger(false)}
          >
            x
          </div>
          <div
            className="lg:hidden absolute top-10 w-full bg-black flex flex-col p-4 gap-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <a href="/index">
              <span className="uppercase text-[13px] tracking-widest" style={{ color: "var(--text-muted)" }}>
                /index
              </span>
            </a>
            <a href="/about">
              <span className="uppercase text-[13px] tracking-widest" style={{ color: "var(--text-muted)" }}>
                /about
              </span>
            </a>
          </div>
        </>
      )}

      <div className="lg:flex lg:flex-row lg:items-center lg:justify-between lg:mr-6 hidden">
        <a href="/index" className={linkClass} style={linkStyle}>
          <span className="mx-4">/index</span>
        </a>
        <a href="/about" className={linkClass} style={linkStyle}>
          <span className="mx-4">/about</span>
        </a>
      </div>
    </nav>
  )
}

export default Navigator
