const About = () => {
  return (
    <div
      className="relative z-10 font-mono px-8 lg:w-4/5 flex flex-col items-center lg:items-start w-full mt-16 pb-16 max-w-3xl"
      style={{ color: "var(--text-body)", fontSize: "14px", lineHeight: 1.5 }}
    >
      <p className="uppercase text-[13px] tracking-widest mb-5" style={{ color: "var(--text-muted)" }}>
        ~Artist
      </p>

      <div className="font-thin space-y-3">
        <p>
          Wasawat Somno (1994) is a programmer who finds himself lately doing visual and music with code.
          He enjoys playing with different programs and frameworks — TouchDesigner, SuperCollider, Tidal
          Cycles, MaxMSP, Hydra.js, and the list keeps growing.
        </p>
        <p>
          He sometimes plays VJ in the club scene or visual/audio at art scene with friends and collective,
          for example DXPRNZ by Blozxom at DECOMMUNE (2022) using TouchDesigner and AI generated images,
          and Buddhasilp.io at AraiArai (2021) using live-coding language Veda.GLSL. He also duo with
          Thanapat Ryan in Diage festival at live-coding music stage, and visual for People of Ari in
          RE:SYN using TouchDesigner with OSC.
        </p>
        <p>
          He is interested in organizing tech art/music events including BYOB (Bring Your Own Beamer)
          with JAAG (Joint artistic Amateur Group) at Bangkok CityCity Gallery (2023), live-coding music
          with Thanapat Ryan in “The end is near — A dystopian Electronic Party” at DECOMMUNE (2022),
          Iterations and sequences at Community lab (2023), and Cybernaut party at Unformat Studio (2024)
          with Cornea Cochlear Club.
        </p>
        <p>
          He enjoys collaborating with artists in the hope of seeing technologies exploited more creatively.
          With Tewprai Bualoi he explored memories of digital files in physical form in "I'm thinking of
          you fondly" (2019) at BACC. With Nanut Thanapornrapee he explored AI and innate consciousness,
          metaphorically tied to the reborn of a restaurant. He worked as technical assistant and programmer
          for Nawin Nuthong (2020) at Bangkok CityCity Gallery in "THE IMMORTALS ARE QUITE BUSY THESE DAYS"
          and Ellen Pearlman from ThoughtWorks Art New York in "AIBO" — the BRAIN opera (2019).
        </p>
      </div>

      <a
        className="hover:font-bold block mt-6"
        target="_blank"
        rel="noopener noreferrer"
        href="https://shrouded-runner-ae1.notion.site/Wasawat-Somno-dc377ed5daf94a79a57575adc00331bf?pvs=4"
      >
        <span className="underline uppercase text-[13px] tracking-widest" style={{ color: "var(--text-muted)" }}>
          /More about me/
        </span>
      </a>
    </div>
  )
}

export default About
