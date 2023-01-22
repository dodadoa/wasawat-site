import React, { useState } from "react"
import { Tab } from "@headlessui/react"


const About = () => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  return (
    <div className="font-light font-mono px-8 w-4/5 text-md text-white leading-10 mt-24">
      <Tab.Group onChange={setSelectedIndex}>
        <Tab.List className="">
          <Tab as="button" className={`border-[1px] border-white py-2.5 px-6 text-sm rounded-tl rounded-bl hover:shadow-2xl hover:shadow-yellow-300 focus:outline-none ${selectedIndex === 0 && 'bg-dark-blue'}`}>~Engineer</Tab>
          <Tab as="button" className={`border-[1px] border-white border-l-0 py-2.5 px-6 rounded-tr rounded-br text-sm hover:shadow-2xl hover:shadow-yellow-300 focus:outline-none ${selectedIndex === 1 && 'bg-dark-blue'}`}>~Artist</Tab>
        </Tab.List>
        <Tab.Panels>
          <Tab.Panel>
            <div>
              <p className="pt-14">
                Software engineer. Product enthusiast. Data visualization
                enthusiast.
              </p>
              <p className="pt-6">
                I like functional programming and various fields and aspects of
                programming language (I'm still learning about it). My current
                favorite languages are {' '}
                <u>
                  <a
                    className="hover:underline hover:decoration-red-400"
                    href="https://www.rust-lang.org/"
                    target="_blank"
                  >
                    Rust
                  </a>
                </u>
                , and {' '}
                <u>
                  <a
                    className="hover:underline hover:decoration-red-400"
                    href="https://www.haskell.org/"
                  >
                    Haskell
                  </a>
                </u>
                .
              </p>
              <p className="pt-6">
                I am also currently exploring the low-level programming, data
                engineering, cloud native infrastructure (CNCF stuffs), and
                Blockchain technologies. Sometimes, I live-coding with friends
                using Veda(GLSL) for Algorave. Sometimes, I collaborate with
                artists for art exhibition.
              </p>
            </div>
          </Tab.Panel>
          <Tab.Panel>
            <div>
              <p className="pt-14">
                Wasawat Somno (1994) is a programmer, technologist and jargon
                generator. He collaborates with artists in hope of seeing more
                technologies being exploited more creatively. His previous
                collaboration with artist Tewprai Bualoi explored on memories of
                digital file in a physical forms in "I'm thinking of you
                fondly"(2019). Other examples include a collaboration with Nanut
                Thanapornrapee, in exploring on AI and Innate consciousness,
                methapholically to the reborn of a restaurant and collaboration
                with Humanist.us on exploring the mapping between map, territory
                and physical world in "Tentacular Territoria”(2020). He also
                worked as technical assistant and programmer for artists,
                including Nawin Nuthong(2020) in his solo at Bangkok CityCity
                Gallery in "THE IMMORTALS ARE QUITE BUSY THESE DAYS" and Ellen
                Pearlman from ThoughtWorks Art New York in "AIBO" - the BRAIN
                opera. (2019)
              </p>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}

export default About
