import React, { useState } from 'react'

const Navigator = () => {

    const [showShowcase, setShowShowcase] = useState(false)

    return (
        <nav className="fixed top-0 flex flex-row justify-between border-b-[1px] border-b-white h-16 w-full">
            <div className="p-4 pl-6">
                <a href="/" className="text-white"> ~/giang </a>
            </div>
            <div className="flex flex-row justify-between mr-20 w-48">
                <div
                    onMouseEnter={() => setShowShowcase(true)}
                    onMouseLeave={() => setShowShowcase(false)}
                >
                    <p className="text-white m-4 cursor-pointer"> /showcase </p>
                    {
                    showShowcase && (
                        <div className="relative mt-8 w-24">
                            <div className="p-4 py-2">
                                <p className="text-white">/visual</p>
                            </div>
                            <div className="p-4 py-2">
                                <p className="text-white">/sound</p>
                            </div>
                            <div className="p-4 py-2">
                                <p className="text-white">/collaboration</p>
                            </div>
                        </div>
                    )
                }
                </div>
                <a href="/blog" className="text-white m-4 cursor-pointer">/blog</a>
                <a href="/about" className="text-white m-4 cursor-pointer">/about</a>
            </div>
        </nav>
    )
}

export default Navigator
