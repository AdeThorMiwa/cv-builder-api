const fs = require("fs");
const path = require("path");

exports.moveFile = (from, to) => new Promise((res, rej) => {
    //gets file name and adds it to dir2
    var f = path.basename(from);
    var dest = path.resolve(to, f);

    fs.rename(from, dest, (err) => {
        if (err) rej(err)
        res("Moved")
    });
});