import { useState } from "react"

const Navigator = () => {
  const [openHamburger, setOpenhamburger] = useState(false)

  return (
    <nav className="fixed z-50 top-0 flex flex-row justify-between h-16 w-full font-mono font-normal bg-black">
      <div className="p-4 pl-6 bg-black">
        <a href="/" className="text-white hover:no-underline">
          {" "}
          ~/giang{" "}
        </a>
      </div>
      <div className="lg:hidden">
        <div className="py-6 px-3 w-10 break-all leading-[6px]" onClick={() => setOpenhamburger(true)}>
         ~~
        </div>
      </div>
      {
        openHamburger && (
          <>
          <div className="lg:hidden absolute top-0 right-0 p-2 py-4 w-10 h-10 text-white z-10" onClick={() => setOpenhamburger(false)}> x </div>
          <div className="lg:hidden absolute w-full h-48 bg-dark-blue flex flex-col p-4">
            <a
              href="/blog"
              className=""
            >
              <span className="text-white">/blog</span>
            </a>
            <a
              href="/about"
              className=""
            >
              <span className="text-white">/about</span>
            </a>
            <a
              href="/art"
              className=""
            >
              <span className="text-white">/art</span>
            </a>
            <a
              href="/talks"
              className=""
            >
              <span className="text-white">/talks</span>
            </a>
           
          </div>
          </>
        ) 
      }
      
      <div className="lg:flex lg:flex-row lg:justify-between lg:mr-6 hidden">
        <a
          href="/art"
          className="bg-black hover:bg-dark-blue hover:no-underline flex flex-col align-middle cursor-pointer"
        >
          <span className="text-white m-4">/art</span>
        </a>
        <a
          href="/talks"
          className="bg-black hover:bg-dark-blue hover:no-underline flex flex-col align-middle cursor-pointer"
        >
          <span className="text-white m-4">/talks</span>
        </a>
        <a
          href="/blog"
          className="bg-black hover:bg-dark-blue hover:no-underline flex flex-col align-middle cursor-pointer"
        >
          <span className="text-white m-4">/blog</span>
        </a>
        <a
          href="/about"
          className="bg-black hover:bg-dark-blue hover:no-underline flex flex-col align-middle cursor-pointer"
        >
          <span className="text-white m-4">/about</span>
        </a>
      </div>
    </nav>
  )
}

export default Navigator
