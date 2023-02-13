var express = require("express");
var router = express.Router();
var fs = require("fs");
var path = require("path");
var pdf = require("../utils/html-pdf");
var phantom = require("phantom-html-to-pdf");

const templateDirectory = path.join(__dirname, "../public/templates");
const imageDirectory = path.join(__dirname, "../public/images");
const tmpPdfDirectory = path.join(__dirname, "../public/pdfs");
/* GET home page. */
const env = "prod";

router.get("/", function (req, res, next) {
  fs.readdir(templateDirectory, function (err, files) {
    if (err) {
      console.log("Unable to scan directory: " + err);
      res.status(500).json(err);
    }

    const protocol =
      env === "dev" ? req.protocol : req.headers["x-forwarded-proto"];
    console.log(protocol);

    res.json({
      status: "success",
      templates: files.map((file) => {
        const [name, extension] = file.split(".");
        return {
          name,
          thumbnail: `${protocol}://${req.headers.host}/images/${name}.png`,
          template: `${protocol}://${req.headers.host}/templates/${name}.${extension}`,
        };
      }),
    });
  });
});

router.get("/:name", function (req, res, next) {
  fs.readdir(templateDirectory, function (err, files) {
    //handling error
    if (err) {
      console.log("Unable to scan directory: " + err);
      return res.status(500).json(err);
    }
    //listing all files using forEach
    const template = files.find(
      (file) => file.split(".")[0] === req.params.name
    );
    if (!template)
      return res.status(404).json({
        status: "fail",
        message: "Template not found!",
      });

    const protocol =
      env === "dev" ? req.protocol : req.headers["x-forwarded-proto"];

    res.json({
      status: "success",
      template: {
        name: req.params.name,
        thumbnail: `${protocol}://${req.headers.host}/images/${req.params.name}.png`,
        template: `${protocol}://${req.headers.host}/templates/${template}`,
      },
    });
  });
});

router.post("/", (req, res, next) => {
  const { name } = req.body;

  if (!req.files)
    return res.status(400).json({
      status: "fail",
      message: `Invalid parameters`,
    });

  const { thumbnail, template } = req.files;
  if (!name || !thumbnail || !template) {
    return res.status(400).json({
      status: "fail",
      message: `Invalid parameters`,
    });
  }

  if (thumbnail.mimetype !== "image/png")
    return res.status(400).json({
      status: "fail",
      message: "Thumbnail must be a png file",
    });

  if (template.mimetype !== "text/x-handlebars-template")
    return res.status(400).json({
      status: "fail",
      message: "Template must be a (.hbs) or (.handlebars) file",
    });

  template.mv(path.join(templateDirectory, `${name}.hbs`), (err) => {
    if (err)
      return res.status(500).json({
        status: "fail",
        message: "Something went wrong while uploading template",
      });

    thumbnail.mv(path.join(imageDirectory, `${name}.png`), (err) => {
      if (err)
        return res.status(500).json({
          status: "fail",
          message: "Something went wrong while uploading thumbnail",
        });

      res.json({
        status: "success",
        template: {
          name,
          thumbnail: `${req.headers["x-forwarded-proto"]}://${req.headers.host}/images/${name}.png`,
          template: `${req.headers["x-forwarded-proto"]}://${req.headers.host}/templates/${name}.hbs`,
        },
      });
    });
  });
});

// deprecated - was converting to png and the convert library was too heavy (12 freaggin MB)

// router.post("/toPdf", async (req, res, next) => {
//     const { blob } = req.body;
//     if (!blob) return res.status(400).json({
//         status: "fail",
//         message: `Invalid parameters`
//     })

//     const pdf = new jsPDF();
//     pdf.addImage(blob, 'JPEG', 0, 0);

//     const filename = `download_${Date.now()}.pdf`;
//     pdf.save(filename)

//     try {
//         await moveFile(path.join(rootDirectory, filename), tmpPdfDirectory)
//     } catch (e) {
//         res.status(500).json({ status: "error", message: "something went wrong" })
//     }

//     console.log(req.protocol)

//     res.json({
//         status: "success",
//         downloadLink: `${req.protocol}://${req.headers.host}/pdfs/${filename}`
//     })
// });

router.post("/v1/toPdf", async (req, res, next) => {
  const { html } = req.body;
  if (!html || !html.trim().length)
    return res.status(400).json({
      status: "fail",
      message: `Invalid parameters`,
    });

  if (env === "not_dev") {
    pdf_lts.create();
    phantom.call();
  }

  const filename = `download_${Date.now()}.pdf`;
  pdf
    .create(html, {
      format: "Letter",
    })
    .toFile(path.join(tmpPdfDirectory, filename), (err, result) => {
      console.error(err);
      if (err) {
        return res
          .status(500)
          .json({ status: "error", message: "something went wrong" });
      }

      const protocol =
        env === "dev" ? req.protocol : req.headers["x-forwarded-proto"];

      res.json({
        status: "success",
        downloadLink: `${protocol}://${req.headers.host}/pdfs/${filename}`,
      });
    });
});

// was never an option -

// router.post("/v2/toPdf", async (req, res, next) => {
//     const { html } = req.body;
//     if (!html || !html.trim().length) return res.status(400).json({
//         status: "fail",
//         message: `Invalid parameters`
//     })

//     const filename = `download_${Date.now()}.pdf`;

//     conversion({ html }, function (err, pdf) {
//         var output = fs.createWriteStream(path.join(tmpPdfDirectory, filename))
//         console.log(pdf.logs);
//         console.log(pdf.numberOfPages);
//         // since pdf.stream is a node.js stream you can use it
//         // to save the pdf to a file (like in this example) or to
//         // respond an http request.
//         pdf.stream.pipe(output);
//         res.json({
//             status: "success",
//             downloadLink: `${req.protocol}://${req.headers.host}/pdfs/${filename}`
//         })
//     });
// });

module.exports = router;
