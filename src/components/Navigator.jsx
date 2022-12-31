import React, { useState } from 'react'

const Navigator = () => {

    const [showShowcase, setShowShowcase] = useState(false)

    return (
        <nav className="fixed top-0 flex flex-row justify-between border-b-[1px] border-b-white h-16 w-full">
            <div className="m-4 ml-6">
                <p className="text-white"> ~/giang </p>
            </div>
            <div className="flex flex-row justify-between mr-20 w-48">
                <div>
                    <p className="text-white m-4 cursor-pointer"
                        onMouseEnter={() => setShowShowcase(true)}
                        onMouseLeave={() => setShowShowcase(false)}
                    > /showcase </p>
                    {
                    showShowcase && (
                        <div className="relative mt-6 ml-1 border-white border-[1px] border-t-0 w-24 h-16">
                        </div>
                    )
                }
                </div>
                <p className="text-white m-4 cursor-pointer">/blog</p>
                <p className="text-white m-4 cursor-pointer">/about</p>
            </div>
        </nav>
    )
}

export default Navigator
