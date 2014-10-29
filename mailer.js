var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var csvparser = require('csv-parse');
var fs = require('fs');
var async = require('async');

var program = require('commander')
    .version('0.0.1')
    .option('-u, --user [username]', 'SMTP server username. Is used to populate the \'from\' parameter of the emails.')
    .option('-k, --key [key]', 'SMTP server key/password.')
    .option('-h, --host [uri]', 'SMTP server host.')
    .option('-p, --port [int]', 'SMTP server port.')
    .option('-t, --template [path]', 'Path to email template/html.')
    .option('-s, --subject [subject]', 'Email subject.')
    .option('-r, --recipients [path]', 'Path to csv file with one column of recipients.')
    .option('-d, --delay', '(Optional) Time to wait in between sending emails in milliseconds.')
    .option('-f, --from [email]', '(Optional) Override -u argument and specify your own \'from\' parameter.');

program.on('--help', function(){
    console.log("  Example:");
    console.log("");
    console.log("    $ custom-help --help");
    console.log("");
    console.log("  Alternative text email is unsupported.");
    console.log("");
});

program.parse(process.argv);


var transporter;


function mail(recipients, cb) {
    var template = fs.readFileSync(program.template, {encoding: "utf8"});
    async.eachSeries(recipients,
        function (recipient, cb) {
            var mailOptions = {
                from: program.from || program.user,
                to: recipient,
                subject: program.subject,
                html: template
            };

            transporter.sendMail(mailOptions, function (err, info) {
                if (err) return cb(err);
                console.log("------------------------------------------------------------");
                console.log("Sent: " + info.response);
                console.log(JSON.stringify(info, null, 2));
                if (program.delay) return setTimeout(cb, program.delay);
                return cb();
            });
        },
        function (err) {
            return cb(err);
        }
    );

};

function config(cb) {
    if ( ! program.user )       return cb(new Error("Missing -u argument. Use --help for more information."));
    if ( ! program.key )        return cb(new Error("Missing -k argument. Use --help for more information."));
    if ( ! program.host )       return cb(new Error("Missing -h argument. Use --help for more information."));
    if ( ! program.port )       return cb(new Error("Missing -p argument. Use --help for more information."));
    if ( ! program.template )   return cb(new Error("Missing -t argument. Use --help for more information."));
    if ( ! program.subject )    return cb(new Error("Missing -s argument. Use --help for more information."));
    if ( ! program.recipients ) return cb(new Error("Missing -r argument. Use --help for more information."));

    console.log("Configuring.");
    var config = {
        host: program.host,
        port: program.port,
        auth: {
            user: program.user,
            pass: program.key,
        },
    };
    transporter = nodemailer.createTransport(smtpTransport(config));
    console.log("Mailer configured.");

    var input = fs.readFileSync(program.recipients, {encoding: 'utf8'});
    csvparser(input, {}, function (err, output) {
        if (err) return console.error(err);

        var recipients = [];
        output.forEach(function (recipient) {
            recipients.push(recipient[0]);
        });

        return cb(null, recipients);
    });
};

function main() {
    console.log("");
    console.log("");
    config(function (err, recipients) {
        if (err) return console.error(err.message);
        mail(recipients, function (err) {
            if (err) throw err;
            console.log("Emails sent.");
            console.log("");
        });
    });
};

main();
