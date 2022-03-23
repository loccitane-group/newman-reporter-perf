const _ = require('lodash');

/**
 * One request timing
 */
class RequestTiming {
    constructor(iteration, name, elapsedMS, status) {
        this.iteration = iteration;
        this.name = name;
        this.elapsedMS = elapsedMS;
        this.status = status;
    }
}

/**
 * As a request can be repeated (during one iteration)
 */
class IterationRequestTimingSummary {
    constructor(iteration, name, elapsedMS, statuses) {
        this.iteration = iteration;
        this.name = name;
        this.elapsedMS = elapsedMS;
        this.statuses = statuses;
    }
}

/**
 * For one request, the timings across iterations
 */
class RequestTimingSummary {
    constructor(name, elapsedMSes) {
        this.name = name;
        this.elapsedMSes = elapsedMSes;
    }
}

function quantiles(values) {
    const vs = _.orderBy(values);
    const n = vs.length;
    const median = (vs.length % 2 == 0) ? ((vs[n / 2 - 1] + vs[n / 2]) / 2) : vs[(n - 1) / 2];
    return {min: vs[0], median: median, max: vs[n - 1]}
}

/**
 * (From newman-report-html)
 * Resolves the fully qualified name for the provided item
 *
 * @param {PostmanItem|PostmanItemGroup} item The item for which to resolve the full name
 * @param {?String} [separator=SEP] The separator symbol to join path name entries with
 * @returns {String} The full name of the provided item, including prepended parent item names
 * @private
 */
function getFullName(item, separator) {
    if (_.isEmpty(item) || !_.isFunction(item.parent) || !_.isFunction(item.forEachParent)) {
        return;
    }

    var chain = [];

    item.forEachParent(function (parent) {
        chain.unshift(parent.name || parent.id);
    });

    item.parent() && chain.push(item.name || item.id); // Add the current item only if it is not the collection

    return chain.join(_.isString(separator) ? separator : SEP);
}

function NewmanReporterPerf(newman, options, collectionRunOptions) {

    const cursorStarts = {};
    const requestTimings = [];

    newman.on('beforeRequest', function (err, args) {
        const {cursor} = args;
        cursorStarts[cursor['ref']] = Date.now();
    })
        .on('request', function (err, args) {
            const {cursor, item, response} = args;
            const t = Date.now() - cursorStarts[cursor['ref']];
            delete cursorStarts[cursor['ref']];
            requestTimings.push(
                new RequestTiming(
                    cursor['iteration'],
                    getFullName(item, '/'),
                    t,
                    response['code'],
                )
            );
        })
        .on('beforeDone', function () {
            const iterationTimingSummary = _.chain(requestTimings)
                .groupBy((rt) => `${rt.iteration}/${rt.name}`)
                .map((rts, k) => new IterationRequestTimingSummary(
                    rts[0].iteration,
                    rts[0].name,
                    _.sumBy(rts, rt => rt.elapsedMS),
                    _.countBy(rts, rt => rt.status)
                ))
                .value()
            const requestTimingSummary = _.chain(iterationTimingSummary)
                .groupBy((rt) => rt.name)
                .map((rts, k) => new RequestTimingSummary(
                    rts[0].name,
                    _.map(rts, rt => rt.elapsedMS)
                ))
                .value()

            let buffer;
            if (options['json']) {
                const json = {};
                if (options['perIteration']) {
                    json['perIteration'] = iterationTimingSummary;
                }
                json['perRequest'] = requestTimingSummary.map(function (ts) {
                    ts.elapsedMSesQuantiles = quantiles(ts.elapsedMSes);
                    return ts;
                });
                buffer = JSON.stringify(json)
            } else {
                buffer = '';
                if (options['perIteration']) {
                    buffer += '---------- Per iteration/request ----------\n';
                    buffer += 'iteration\telapsed (ms)\tname\tstatus codes\n';
                    iterationTimingSummary.forEach((ts) => {
                        const statusStr = _.chain(ts.statuses).map((n, k) => [n, k]).orderBy(p => p[1]).map(p => `${p[1]}(${p[0]})`).value().join(', ');
                        buffer += `${ts.iteration}\t${ts.elapsedMS}\t${ts.name}\t${statusStr}\n`;
                    });
                }
                buffer += '---------- Timing per request (ms) ----------\n';
                buffer += 't_min\tt_median\tt_max\tname\n';
                requestTimingSummary.forEach((ts) => {
                    const qs = quantiles(ts.elapsedMSes);
                    buffer += `${qs['min']}\t${qs['median']}\t${qs['max']}\t${ts.name}\n`;
                });
            }
            if (options['stdout']) {
                console.log(buffer);
            } else {
                const suffix = options['json'] ? 'json' : 'tsv';
                this.exports.push({
                    name: 'perf-reporter',
                    default: 'newman-run-report-perf.' + suffix,
                    path: options.export,
                    content: buffer
                });
            }
        });
}

module.exports = NewmanReporterPerf
