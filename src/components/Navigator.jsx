import React, { useState } from "react"

const Navigator = () => {
  const [showShowcase, setShowShowcase] = useState(false)

  return (
    <nav className="fixed z-50 top-0 flex flex-row justify-between border-b-[1px] border-b-white h-16 w-full font-mono font-normal bg-black">
      <div className="p-4 pl-6 bg-black">
        <a href="/" className="text-white hover:no-underline">
          {" "}
          ~/giang{" "}
        </a>
      </div>
      <div className="flex flex-row justify-between mr-6">
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
