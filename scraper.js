const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fetch = require("isomorphic-fetch");
const _ = require("lodash");
const fs = require("fs");

const getForOffset = offset => {
    const url = `http://www.bundestag.de/ajax/filterlist/de/dokumente/protokolle/plenarprotokolle/-/442112/h_6810466be65964217012227c14bad20f?limit=10&noFilterSet=true&offset=${offset}`;
    return fetch(url)
        .then(response => {
            console.log(`Finished downloading page with offset ${offset}`);
            if (response.status >= 400) {
                throw new Error("Bad response from server");
            }
            return response.text();
        })
        .then(html => {
            return new JSDOM(html);
        })
        .catch(console.error);
};

const getTops = dom => {
    const trs = dom.window.document.querySelectorAll(".bt-table-data tbody tr");
    return Array.from(trs).map(tr => {
        const lis = tr.querySelectorAll(".bt-top-liste > li");
        const session = tr.querySelector("td:nth-child(2)").textContent;
        const sessionData = Array.from(lis).map(li => {
            const agg = {};
            agg["topic"] = li.querySelector("strong").textContent.trim();
            agg["speakers"] = Array.from(
                li.querySelectorAll(".bt-redner-liste strong")
            ).map(strong => strong.textContent);
            return agg;
        });
        return { tops: sessionData, session };
    });
};

const downloadAndWrite = (filepath) => {
    const requests = [];
    for (let offset = 0; offset < 250; offset += 10) {
        requests.push(getForOffset(offset));
    }

    Promise.all(requests).then(promises => {
        const res = _.flatMap(promises, data => getTops(data));
        const json = JSON.stringify(res, null, 2);
        fs.writeFile(filepath, json, "utf8", () =>
            console.log("Done Writing! ✍️")
        );
    });
};

const main = () => {
    const filepath = process.argv[2];
    if (!filepath) {
        console.error(
            "⚠️ You need to supply the path that the file should be written to"
        );
        return;
    }
    downloadAndWrite(filepath);
};

main();
