import React, { useState } from "react"

const Navigator = () => {
  const [showShowcase, setShowShowcase] = useState(false)

  return (
    <nav className="fixed z-50 top-0 flex flex-row justify-between border-b-[1px] border-b-white h-16 w-full font-mono font-normal bg-black">
      <div className="p-4 pl-6">
        <a href="/" className="text-white">
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
              <div className="p-4 py-3 border-[1px] border-t-0 border-white bg-black hover:bg-dark-blue">
                <p className="text-white">/visual</p>
              </div>
              <div className="p-4 py-3 border-[1px] border-t-0 border-white bg-black hover:bg-dark-blue">
                <p className="text-white">/sound</p>
              </div>
              <div className="p-4 py-3 border-[1px] border-t-0 border-white bg-black hover:bg-dark-blue">
                <p className="text-white">/collaboration</p>
              </div>
            </div>
          )}
        </div>
        <a href="/blog" className="text-white m-4 cursor-pointer">
          /blog
        </a>
        <a href="/about" className="text-white m-4 cursor-pointer">
          /about
        </a>
      </div>
    </nav>
  )
}

export default Navigator
