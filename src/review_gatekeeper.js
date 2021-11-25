"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.ReviewGatekeeper = void 0;
function set_equal(as, bs) {
    if (as.size !== bs.size) {
        return false;
    }
    for (var _i = 0, as_1 = as; _i < as_1.length; _i++) {
        var a = as_1[_i];
        if (!bs.has(a)) {
            return false;
        }
    }
    return true;
}
function set_intersect(as, bs) {
    return new Set(__spreadArray([], as, true).filter(function (e) { return bs.has(e); }));
}
function set_to_string(as) {
    return __spreadArray([], as, true).join(', ');
}
var ReviewGatekeeper = /** @class */ (function () {
    function ReviewGatekeeper(settings, approved_users, pr_owner) {
        this.messages = [];
        this.meet_criteria = true;
        var approvals = settings.approvals;
        // check if the minimum criteria is met.
        if (approvals.minimum) {
            if (approvals.minimum > approved_users.length) {
                this.meet_criteria = false;
                this.messages.push("".concat(approvals.minimum, " reviewers should approve this PR (currently: ").concat(approved_users.length, ")"));
            }
        }
        // check if the groups criteria is met.
        var approved = new Set(approved_users);
        if (approvals.groups) {
            for (var _i = 0, _a = approvals.groups; _i < _a.length; _i++) {
                var group = _a[_i];
                var required_users = new Set(group.from);
                // Remove PR owner from required uesrs because PR owner cannot approve their own PR.
                required_users["delete"](pr_owner);
                var approved_from_this_group = set_intersect(required_users, approved);
                var minimum_of_group = group.minimum;
                if (minimum_of_group) {
                    if (minimum_of_group > approved_from_this_group.size) {
                        this.meet_criteria = false;
                        this.messages.push("".concat(minimum_of_group, " reviewers from the group '").concat(group.name, "' (").concat(set_to_string(required_users), ") should approve this PR (currently: ").concat(approved_from_this_group.size, ")"));
                    }
                }
                else {
                    // If no `minimum` option is specified, approval from all is required.
                    if (!set_equal(approved_from_this_group, required_users)) {
                        this.meet_criteria = false;
                        this.messages.push("All of the reviewers from the group '".concat(group.name, "' (").concat(set_to_string(required_users), ") should approve this PR"));
                    }
                }
            }
        }
    }
    ReviewGatekeeper.prototype.satisfy = function () {
        return this.meet_criteria;
    };
    ReviewGatekeeper.prototype.getMessages = function () {
        return this.messages;
    };
    return ReviewGatekeeper;
}());
exports.ReviewGatekeeper = ReviewGatekeeper;
