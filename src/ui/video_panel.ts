export class VideoPanel {
    scale = document.getElementById("videoScale") as HTMLInputElement;
    scaleVal = document.getElementById("vScaleVal") as HTMLElement;

    scene = document.getElementById("scenes") as HTMLSelectElement;

    constructor() {
        ((this.scale.value = "0.5"), (this.scaleVal.textContent = this.scale.value));

        this.scale.addEventListener("input", () => {
            this.scaleVal.textContent = this.scale.value;
        });

        this.scene.value = "1";
    }

    exportState() {
        return {
            scale: +this.scaleVal.textContent,
            scene: +this.scene.value,
        };
    }
}
