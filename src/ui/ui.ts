import type { State } from "../state.js";
import { BallsPanel } from "./balls_panel.js";
import { VideoPanel } from "./video_panel.js";
import { LyricsPanel } from "./lyrics_panel.js";
import { DrawPanel } from "./draw_panel.js";

//https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions
export class UI {
    state: State;

    hideSettings = document.getElementById("hide") as HTMLInputElement;
    settings = document.getElementById("settings") as HTMLInputElement;

    alg = document.getElementById("alg") as HTMLSelectElement;

    mode = document.getElementById("mode") as HTMLInputElement;
    modePrev = "";

    sky = document.getElementById("sky") as HTMLSelectElement;

    videoInput = document.getElementById("upload1") as HTMLInputElement;
    videoName = document.getElementById("videoName") as HTMLElement;

    audioInput = document.getElementById("upload2") as HTMLInputElement;
    audioName = document.getElementById("audioName") as HTMLElement;

    playPause = document.getElementById("play") as HTMLInputElement;

    volume = document.getElementById("videoVol") as HTMLInputElement;
    volumeValue = document.getElementById("vVolVal") as HTMLElement;

    fluence = document.getElementById("fluence") as HTMLInputElement;
    fluenceVal = document.getElementById("fluenceVal") as HTMLElement;

    resolution = document.getElementById("res") as HTMLInputElement;
    resVal = document.getElementById("resVal") as HTMLElement;

    bounce = document.getElementById("bounce") as HTMLInputElement;

    ballsPanel = new BallsPanel();
    videoPanel = new VideoPanel();
    lyricsPanel = new LyricsPanel();
    drawPanel = new DrawPanel();

    constructor(state: State) {
        this.state = state;

        const sett = this.state.settings;
        const svideo = this.state.video;
        const saudio = this.state.audio;

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        this.alg.value = "hrc";
        this.mode.value = this.modePrev = "lyrics";
        document.getElementById(this.mode.value + "Panel")!.style.display = "flex";

        this.sky.value = "none";

        ((svideo.volume = saudio.volume = 0.5), (this.volume.value = "0.5"));
        ((sett.fluence = 1), (this.fluence.value = "1"));
        ((sett.resolution = isMobile ? 800 : 1024), (this.resolution.value = isMobile ? "700" : "1024"));
        this.bounce.checked = true;
        sett.bounce = true;

        this.volumeValue.textContent = this.volume.value;
        this.fluenceVal.textContent = this.fluence.value;
        this.resVal.textContent = this.resolution.value;

        //complex state changes call a function in state to handle them
        //otherwise state values are updated inline, maybe change this later

        //pure ui should be somewhere else
        this.hideSettings.addEventListener("click", () => {
            const hidden = this.settings.classList.toggle("hidden");
            this.hideSettings.textContent = hidden ? "Show Settings" : "Hide Settings";
        });

        this.alg.addEventListener("change", () => {
            this.state.changeAlg();
        });

        this.mode.addEventListener("change", () => {
            if (this.mode.value === this.modePrev) return;

            document.getElementById(this.modePrev + "Panel")!.style.display = "none";
            document.getElementById(this.mode.value + "Panel")!.style.display = "flex";

            this.modePrev = this.mode.value;

            if (this.mode.value !== "lyrics") {
                this.state.toggleAudio(true);
            }

            //ts bad
            if (this.mode.value !== "video" && this.mode.value !== "holes" && this.mode.value !== "balls") {
                this.state.toggleVideo(true);
            }

            if (this.mode.value === "video") {
                this.fluence.value = "2";
            } else {
                this.fluence.value = "1";
            }

            this.fluence.dispatchEvent(new Event("input"));
            this.state.changeMode();
        });

        this.sky.addEventListener("change", () => {
            this.state.changeSky(this.sky.value);
        });

        //if mode has the media tag
        this.playPause.addEventListener("click", () => {
            if (this.mode.value !== "lyrics") {
                this.state.toggleVideo(false);
            } else if (this.mode.value === "lyrics") {
                this.state.toggleAudio(false);
            }
        });

        this.volume.addEventListener("input", () => {
            this.state.setMediaVolume(+this.volume.value);
            this.volumeValue.textContent = this.volume.value;
        });

        this.fluence.addEventListener("input", () => {
            sett.fluence = +this.fluence.value;
            this.fluenceVal.textContent = this.fluence.value;
        });

        this.resolution.addEventListener("change", () => {
            sett.resolution = +this.resolution.value;
            this.resVal.textContent = this.resolution.value;
            this.state.changeRes();
        });

        this.bounce.addEventListener("click", () => {
            sett.bounce = this.bounce.checked;
        });

        //handles video files
        //create element does NOT put the element in the Dom it only exists in memory
        this.videoInput.addEventListener("change", () => {
            const file = this.videoInput.files![0];
            const video = document.createElement("video");
            const url = URL.createObjectURL(file);

            video.src = url;
            this.videoName.textContent = file.name;

            video.addEventListener(
                "canplay",
                () => {
                    this.state.loadVideo(video);
                },
                { once: true },
            );
        });

        //handles audio files
        this.audioInput.addEventListener("change", () => {
            if (this.state.audio.loading) {
                console.log("cant upload while waiting response!");
                return;
            }

            const file = this.audioInput.files![0];
            const audio = document.createElement("audio");
            const url = URL.createObjectURL(file);

            const name = file.name.split("-");
            const trackName = name[0].trim();
            const artistName = name[1].trim().replace(/\.[^/.]+$/, "");

            audio.src = url;
            this.audioName.textContent = file.name;

            audio.addEventListener(
                "canplay",
                () => {
                    this.mode.value = "lyrics";
                    this.mode.dispatchEvent(new Event("change"));
                    this.state.loadAudio(audio, trackName, artistName);
                },
                { once: true },
            );
        });
    }
}
