import { useState } from "react"

const About = () => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const tabClass = (active) =>
    `border py-2.5 px-6 text-[13px] uppercase tracking-widest focus:outline-none ${
      active ? "text-[var(--text)] border-[var(--border)]" : "text-[var(--text-muted)] border-[var(--border-subtle)]"
    }`
  const tabStyle = (active) => ({
    background: active ? "var(--bg-elevated)" : "var(--bg)",
  })

  return (
    <div className="relative z-10 font-mono px-8 lg:w-4/5 text-md flex flex-col items-center lg:items-start w-full leading-8 mt-24 pb-20" style={{ color: "var(--text-body)" }}>
      <div className="font-light flex" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={selectedIndex === 0}
          onClick={() => setSelectedIndex(0)}
          className={`${tabClass(selectedIndex === 0)} rounded-tl rounded-bl`}
          style={tabStyle(selectedIndex === 0)}
        >
          ~Engineer
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedIndex === 1}
          onClick={() => setSelectedIndex(1)}
          className={`${tabClass(selectedIndex === 1)} border-l-0 rounded-tr rounded-br`}
          style={tabStyle(selectedIndex === 1)}
        >
          ~Artist
        </button>
      </div>

      {selectedIndex === 0 && (
        <div className="font-thin" role="tabpanel">
          <p className="pt-14">
            I am a software developer who is also interested in developing consulting skills and product
            development. I value quality code and teamwork. I am passionate about software development and
            also interested in practices such as pair programming, trunk-based development, continuous
            integration, and continuous delivery. My skills vary ranging from frontend to backend and
            infrastructure.
          </p>
          <p className="pt-6">
            I like functional programming and various fields and aspects of programming language. My current
            favorite languages are{" "}
            <u>
              <a className="hover:underline hover:decoration-red-400" href="https://www.rust-lang.org/" target="_blank">
                Rust
              </a>
            </u>
            ,{" "}
            <u>
              <a className="hover:underline hover:decoration-red-400" href="https://ziglang.org/" target="_blank">
                Zig
              </a>
            </u>
            , and{" "}
            <u>
              <a className="hover:underline hover:decoration-red-400" href="https://www.haskell.org/">
                Haskell
              </a>
            </u>
            .
          </p>
          <p className="pt-6">
            I am also currently exploring the low-level programming, data engineering, cloud native
            infrastructure (CNCF stuffs), and Graphic programming (as a hobby). Sometimes, I live-coding
            with friends using Veda(GLSL) for Algorave. Sometimes, I collaborate with artists for art
            exhibition.
          </p>
        </div>
      )}

      {selectedIndex === 1 && (
        <div className="font-thin" role="tabpanel">
          <p className="pt-14">
            Wasawat Somno (1994) is a programmer who finds himself lately doing visual and music with code.
            He enjoys playing with different programs and frameworks - TouchDesigner, SuperCollider, Tidal
            Cycles, MaxMSP, Hydra.js, and the list keeps growing up.
            <br />
            <br />
            He sometimes plays VJ in the club scene or visual/audio at art scene with friends and collective,
            for example DXPRNZ by Blozxom at DECOMMUNE (2022) using TouchDesigner and AI generated images,
            and Buddhasilp.io at AraiArai (2021) using live-coding language: Veda.GLSL. He also duo with
            Thanapat Ryan in Diage festival at live-coding music stage. He was also doing visual for music
            performance for People of Ari in RE:SYN using TouchDesigner working with OSC.
            <br />
            <br />
            He is also interested in organizing tech art/music events including BYOB (Bring Your Own Beamer)
            with his collective JAAG (Joint artistic Amateur Group) at Bangkok CityCity Gallery (2023)
            featuring, also organizing live-coding music event with Thanapat Ryan in “The end is near - A
            dystopian Electronic Party” at DECOMMUNE (2022), Iterations and sequences at Community lab
            (2023), and Cybernaut party at Unformat Studio (2024) featuring artists from New York and Ho
            Chi Minh with his collective Cornea Cochlear Club.
            <br />
            <br />
            He also enjoys collaborating with artists in the hope of seeing more technologies being exploited
            more creatively. His previous collaboration with artist Tewprai Bualoi explored memories of
            digital files in a physical form in "I'm thinking of you fondly"(2019) at BACC. Other examples
            include a collaboration with Nanut Thanapornrapee, in exploring AI and Innate consciousness,
            methapholically to the reborn of a restaurant. He also worked as a technical assistant and
            programmer for artists, including Nawin Nuthong (2020) in his solo at Bangkok CityCity Gallery
            in "THE IMMORTALS ARE QUITE BUSY THESE DAYS" and Ellen Pearlman from ThoughtWorks Art New York
            in "AIBO" - the BRAIN opera (2019).
          </p>
          <a
            className="hover:font-bold block w-44"
            target="_blank"
            href="https://shrouded-runner-ae1.notion.site/Wasawat-Somno-dc377ed5daf94a79a57575adc00331bf?pvs=4"
          >
            <p className="pt-10 underline uppercase text-[13px] tracking-widest" style={{ color: "var(--text-muted)" }}>/More about me/</p>
          </a>
        </div>
      )}
    </div>
  )
}

export default About
