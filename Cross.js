import { launch } from "puppeteer";

(async () => {
    const browser = await launch({
        headless: false,
        args: ["--start-maximized"],
        defaultViewport: null,
    });
    let page = await browser.newPage();

    const letters = "abcdefghijklmnopqrstuvwxyz";

    await page.goto("https://www.boatloadpuzzles.com/playcrossword", {
        waitUntil: ["networkidle0"],
    });

    const pointer_position = async () => {
        let position = await page.evaluate(async () => {
            let position = {};
            const frame =
                document.querySelector("iframe[id^='u']").contentWindow;
            const pointer = frame.document.querySelector(".gselsquare");
            position["left"] = pointer.style.left;
            position["top"] = pointer.style.top;
            return position;
        });
        return position;
    };

    let current_position = await pointer_position();

    const position_result = async (position) => {
        let result = await page.evaluate(async (position) => {
            let result = {};
            const frame =
                document.querySelector("iframe[id^='u']").contentWindow;
            const block = frame.document.querySelector(
                `.glet[style*='left: ${position.left};'][style*='top: ${position.top};']`
            );
            if (block === null) {
                result["text"] = null;
                result["color"] = null;
            } else {
                result["text"] = block.innerText;
                result["color"] = block.style.color;
            }
            return result;
        }, position);
        return result;
    };

    let index = 0;

    await page.evaluate(async () => {
        window.stop();
        const frame = document.querySelector("iframe[id^='u']").contentWindow;
        document.querySelector("iframe[id^='u']").scrollIntoView();
        frame.document.querySelector("div.m").click();
    });

    await page.focus("iframe[id^='u']");

    const solve = async () => {
        await page.focus("iframe[id^='u']");
        await page.keyboard.press(letters[index], { delay: 0 });
        if ((await position_result(current_position)).color == "red") {
            await page.keyboard.press("Backspace", { delay: 0 });
            index += 1;
            index = index % 26;
            solve(index);
        } else {
            const check = async () => {
                let left_check =
                    current_position.left == (await pointer_position()).left;
                let top_check =
                    current_position.top == (await pointer_position()).top;
                return left_check && top_check;
            };
            if (await check()) {
                await page.keyboard.press("ArrowRight");
            }
            current_position = await pointer_position();
            await page.focus("iframe[id^='u']");
            let alldone = await page.evaluate(() => {
                const frame =
                    document.querySelector("iframe[id^='u']").contentWindow;
                let p = Array.from(frame.document.querySelectorAll("p"));
                let allp = [];
                for (let i = 0; i < p.length; i++) {
                    allp.push(p[i].innerHTML);
                }
                let filterp = allp.filter((p) => p === "Puzzle complete!");
                return filterp.length;
            });

            if (alldone > 0) {
                await page.evaluate(() => {
                    alert("Done!");
                });
                await page.screenshot({
                    path: "screenshot.png",
                    fullPage: true,
                });
                await browser.close()
            } else {
                solve();
            }
        }
    };

    await solve(index);
})();
