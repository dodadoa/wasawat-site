import React, { useState, useEffect } from "react"

const Tabs = (props) => {
  const [selected, setSelected] = useState(0)

  

  return (
    <div className="flex flex-row mb-0">
      <div onClick={() => setSelected(0)} className={`mt-10 w-48 h-10 rounded-tl rounded-bl border-[1px] hover:shadow-2xl hover:shadow-yellow-300 border-white border-r-0 cursor-pointer ${selected === 0 ? 'bg-dark-blue text-white' : ''}`}>
        <p className="p-2.5 text-xs"> ~Engineer </p>
      </div>
      <div onClick={() => setSelected(1)} className={`mt-10 w-48 h-10 rounded-tr rounded-br border-[1px] hover:shadow-2xl hover:shadow-yellow-300 border-white cursor-pointer  ${selected === 1 ? 'bg-dark-blue text-white' : ''}`}>
        <p className="p-2.5 text-xs"> ~Artist </p>
      </div>
    </div>
  )
}

export default Tabs
