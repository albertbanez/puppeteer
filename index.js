require("dotenv").config();
const db = require('./db.js');
const puppeteer = require('puppeteer');

(async function main() {
  try {
    const browser = await puppeteer.launch();
    const [page] = await browser.pages();

    var addresses = await db.getDamominer();
    
    for (var add in addresses){
        await page.goto('https://www.damominer.hk/miner/' + addresses[add].address, { waitUntil: 'networkidle0' });
        const data = await page.evaluate(() => document.querySelector('*').outerHTML);

        var dataNeeded = GetPageSourceNeeded(data, "算力&nbsp; <span data-v-64120c84=\"\"> (P/s){%}]--></div></div>");
        var strComputingPower = getDamominerData(dataNeeded);
        
        dataNeeded = GetPageSourceNeeded(data, "Total Rewards (Credits){%}]--></div></div>");
        var strTotalRewards = getDamominerData(dataNeeded);
        
        await db.insertDamominer(strComputingPower, strTotalRewards, addresses[add].address);
        await db.deleteDamominer();

        console.log(strComputingPower);
        console.log(strTotalRewards);
    }

    await browser.close();

  } catch (err) {
    console.error(err);
  }
})();




function getDamominerData(dataNeeded){

    var dataArr =[];
    var n = dataNeeded.search(/<span class="font-bold val-text" data-v-64120c84="">.*.<\/span>/i);
    var cleanData = dataNeeded.substr(n, dataNeeded.length); //removes extra info in front
    var is_search =true;
    while(is_search){
       
        var span_start = cleanData.search(/<span class="font-bold val-text" data-v-64120c84="">.*.<\/span>/i);
        var span_end = cleanData.search(/<\/span>/i);
        span_end =span_end+7;
        dataArr.push(cleanData.substr(span_start, span_end));
        cleanData = cleanData.substr(span_end,cleanData.length);
        var next_search = cleanData.search(/<span class="font-bold val-text" data-v-64120c84="">.*.<\/span>/i);
   
        if(next_search<0){
            is_search=false;
        }
    }

    var arrFinalData =[];
    for (var i = 0; i < dataArr.length; i++) {
      
        var data = dataArr[i].replace(/<span class="font-bold val-text" data-v-64120c84="">/i, "");
            data = data.replace(/<\/span>/i, "");
        arrFinalData.push(data);
    }
    arrFinalData= arrFinalData.reverse();
    var strFinalData = arrFinalData.join("");
    return strFinalData;
}



String.prototype.replaceAll = function (target, payload) {
    let regex = new RegExp(target, 'g')
    return this.valueOf().replace(regex, payload)
};







function GetPageSourceNeeded(strPagesource, strGlobalpattern)
{
    strPagesource = strPagesource.replaceAll("\n", "");
    strPagesource = strPagesource.replaceAll("\r", "");
    strPagesource = strPagesource.replaceAll("\t", "");
    strGlobalpattern = strGlobalpattern.replaceAll("\n", "");
    strGlobalpattern = strGlobalpattern.replaceAll("\r", "");
    strGlobalpattern = strGlobalpattern.replaceAll("\t", "");

    var ArrayGlobalpattern = [];

    var intPercentlocation;
    var intAsterisklocation;
    var intBracketLocation;

    while (strGlobalpattern.length != 0)
    {
        intPercentlocation = strGlobalpattern.indexOf("{%}");
        intAsterisklocation = strGlobalpattern.indexOf("{*}");

        if (intPercentlocation == -1 && intAsterisklocation == -1)
        {
            intBracketLocation = -1;
        }
        else if (intAsterisklocation == -1)
        {
            intBracketLocation = intPercentlocation;
        }
        else if (intPercentlocation == -1)
        {
            intBracketLocation = intAsterisklocation;
        }
        else
        {
            if (intPercentlocation < intAsterisklocation)
            {
                intBracketLocation = intPercentlocation;
            }
            else
            {
                intBracketLocation = intAsterisklocation;
            }
        }


        if (intBracketLocation == -1)
        {
            ArrayGlobalpattern.push(strGlobalpattern);
            strGlobalpattern = "";
        }
        else if (intBracketLocation == 0)
        {
            ArrayGlobalpattern.push(strGlobalpattern.substr(0, 3));
            strGlobalpattern = strGlobalpattern.substr(3, strGlobalpattern.length - 3);
        }
        else
        {
            ArrayGlobalpattern.push(strGlobalpattern.substr(0, intBracketLocation));
            strGlobalpattern = strGlobalpattern.substr(intBracketLocation, strGlobalpattern.length - strGlobalpattern.substr(0, intBracketLocation).length);
        }
    }

    var intItemLocation;
    var capturePagesource = "";
    var lastPercent = false;

    for (var item in ArrayGlobalpattern)
    {
        if (ArrayGlobalpattern[item] == "{%}")
        {
            capturePagesource = capturePagesource + strPagesource;
            lastPercent = true;
        }
        else if (ArrayGlobalpattern[item] == "{*}")
        {
            lastPercent = false;
        }
        else
        {
            intItemLocation = strPagesource.indexOf(ArrayGlobalpattern[item]);

            //edited
            if (intItemLocation == -1)
            {
                break;
            }
            //
            strPagesource = strPagesource.substr(intItemLocation + ArrayGlobalpattern[item].length, strPagesource.length - (intItemLocation + ArrayGlobalpattern[item].length));

            if (lastPercent == true)
            {
                capturePagesource = capturePagesource.substr(0, intItemLocation);
            }

            lastPercent = false;
        }
    }

    return capturePagesource;
}
