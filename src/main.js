"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var core = require("@actions/core");
var github = require("@actions/github");
var fs = require("fs");
var YAML = require("yaml");
var os_1 = require("os");
var review_gatekeeper_1 = require("./review_gatekeeper");
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var context, payload, config_file, config_file_contents, token, octokit, reviews, approved_users, _i, _a, review, review_gatekeeper, sha, workflow_url, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    context = github.context;
                    if (context.eventName !== 'pull_request' &&
                        context.eventName !== 'pull_request_review') {
                        core.setFailed("Invalid event: ".concat(context.eventName, ". This action should be triggered on pull_request and pull_request_review"));
                        return [2 /*return*/];
                    }
                    payload = context.payload;
                    config_file = fs.readFileSync(core.getInput('config-file'), 'utf8');
                    config_file_contents = YAML.parse(config_file);
                    token = core.getInput('token');
                    octokit = github.getOctokit(token);
                    return [4 /*yield*/, octokit.rest.pulls.listReviews(__assign(__assign({}, context.repo), { pull_number: payload.pull_request.number }))];
                case 1:
                    reviews = _b.sent();
                    approved_users = new Set();
                    for (_i = 0, _a = reviews.data; _i < _a.length; _i++) {
                        review = _a[_i];
                        if (review.state === "APPROVED") {
                            approved_users.add(review.user.login);
                        }
                    }
                    review_gatekeeper = new review_gatekeeper_1.ReviewGatekeeper(config_file_contents, Array.from(approved_users), payload.pull_request.user.login);
                    sha = payload.pull_request.head.sha;
                    workflow_url = "".concat(process.env['GITHUB_SERVER_URL'], "/").concat(process.env['GITHUB_REPOSITORY'], "/actions/runs/").concat(process.env['GITHUB_RUN_ID']);
                    core.info("Setting a status on commit (".concat(sha, ")"));
                    octokit.rest.repos.createCommitStatus(__assign(__assign({}, context.repo), { sha: sha, state: review_gatekeeper.satisfy() ? 'success' : 'failure', context: 'PR Gatekeeper Status', target_url: workflow_url, description: review_gatekeeper.satisfy()
                            ? undefined
                            : review_gatekeeper.getMessages().join(' ').substr(0, 140) }));
                    if (!review_gatekeeper.satisfy()) {
                        core.setFailed(review_gatekeeper.getMessages().join(os_1.EOL));
                        return [2 /*return*/];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _b.sent();
                    core.setFailed(error_1.message);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
run();
