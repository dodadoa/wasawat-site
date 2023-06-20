import React, { useState } from "react"

const Navigator = () => {
  const [showShowcase, setShowShowcase] = useState(false)
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
        <div className="py-5 px-3 w-10 break-all leading-[6px]" onClick={() => setOpenhamburger(true)}>
         ~~
        </div>
      </div>
      {
        openHamburger && (
          <>
          <div className="lg:hidden absolute top-0 right-0 p-2 w-10 h-10 text-white z-10" onClick={() => setOpenhamburger(false)}> x </div>
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
            <p className="text-white w-36" onClick={() => setShowShowcase((prev) => !prev)}> /showcase </p>
            {
              showShowcase && (
                <div className="flex flex-col ml-4">
                  <a href="/side-project" className="hover:no-underline">
                    <p className="text-white">/side_project</p>
                  </a>
                  <a href="/art" className="hover:no-underline">
                    <p className="text-white">/art</p>
                  </a>
                  <a href="/talks" className="hover:no-underline">
                    <p className="text-white">/talks</p>
                  </a>
                </div>
                
              )
            }
           
          </div>
          </>
        ) 
      }
      
      <div className="lg:flex lg:flex-row lg:justify-between lg:mr-6 hidden">
        <div
          className="cursor-pointer bg-black hover:bg-dark-blue"
          onMouseEnter={() => setShowShowcase(true)}
          onMouseLeave={() => setShowShowcase(false)}
        >
          <p className="text-white m-4 w-36"> /showcase </p>
          {showShowcase && (
            <div className="relative mt-6">
              <a href="/side-project" className="hover:no-underline">
                <div className="p-4 py-3  bg-black hover:bg-dark-blue">
                  <p className="text-white">/side_project</p>
                </div>
              </a>
              <a href="/art" className="hover:no-underline">
                <div className="p-4 py-3 bg-black hover:bg-dark-blue">
                  <p className="text-white">/art</p>
                </div>
              </a>
              <a href="/talks" className="hover:no-underline">
                <div className="p-4 py-3 bg-black hover:bg-dark-blue">
                  <p className="text-white">/talks</p>
                </div>
              </a>
            </div>
          )}
        </div>
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
