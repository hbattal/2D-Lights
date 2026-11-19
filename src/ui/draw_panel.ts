import iro from "@jaames/iro";

export class DrawPanel {
    colorPicker = iro.ColorPicker("#picker", {
        layoutDirection: "horizontal",
        borderWidth: 1,
        width: 200,
        layout: [
            {
                component: iro.ui.Slider,
                options: {
                    sliderType: "hue",
                },
            },
            {
                component: iro.ui.Slider,
                options: {
                    sliderType: "alpha",
                },
            },
            {
                component: iro.ui.Box,
                options: {},
            },
        ],
    });

    size = document.getElementById("brushSize") as HTMLInputElement;
    sizeValue = document.getElementById("bSizeVal") as HTMLElement;
    matType = document.getElementById("matType") as HTMLInputElement;
    clear = document.getElementById("drawClear") as HTMLButtonElement;
    should = false;

    constructor() {
        (((this.size.value = "4"), (this.sizeValue.textContent = this.size.value)), (this.matType.checked = true));
        this.size.addEventListener("input", () => {
            this.sizeValue.textContent = this.size.value;
        });

        this.clear.addEventListener("click", () => {
            this.should = true;
        });
    }

    exportState() {
        const s = {
            color: this.colorPicker.color.rgb,
            alpha: this.colorPicker.color.alpha,
            matType: this.matType.checked,
            size: +this.sizeValue.textContent,
            clear: this.should,
        };

        this.should = false;
        return s;
    }
}
