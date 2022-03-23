# Newman Performance Reporter

Request time timing report for Newman. A newman collection can be ran multiple times and a request also, within an
iteration. The reporter will output per request timings (summing the timings if the same request is called multiple
times during an iteration), but also request timing distribution across the different iterations.

Output can either be text or json.

## Installation

```
npm install newman-reporter-perf --global
```

## Usage

```
newman ... -r perf
```

## Output
If you have 4 queries in 2 folder, ran 10 times, the tsv output looks like.
```
---------- Timing per request (ms) ----------
t_min	t_median	t_max	name
82	165	438	1 - folder A/1 - Create Entity
450	515	2635	1 - folder A/1 - Wait for creation completion
85	94.5	804	1 - folder A/1 - Delete Entity
412	1247	2131	2 - Foilder B/2 - Get workflows
```
It displays the minimum/median/maximum time per request.

The `json` output contains more detailed information.

### Options

| Option | Description|
|--------|------------|
| --reporter-perf-per-iteration | Also report the details for each request per iteration |
| --reporter-perf-json | Output JSON instead of tabulated text |
| --reporter-perf-stdout| Output to stdout instead of file (in `newman/` directory).

# License
The software is release under an ISC license

# Author
Alexandre Masselot
