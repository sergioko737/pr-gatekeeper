import * as core from '@actions/core'
import * as github from '@actions/github'
import * as Webhooks from '@octokit/webhooks-types'
import * as fs from 'fs'
import * as YAML from 'yaml'
import {EOL} from 'os'
import {Settings, ReviewGatekeeper} from './review_gatekeeper'
import {SettingsRequester, ReviewRequester} from './review_requester'
import { Collection } from 'yaml/types'



export async function assignReviewers(client: any, reviewer_persons: Set<any>, reviewer_teams: Set<any>, pr_number: any) {
  try {
    console.log(`entering assignReviewers`)
    console.log(`Persons: ${reviewer_persons.size}`)
    console.log(`Teams: ${reviewer_teams.size}`)
    console.log(`Persons set to string: ${[...reviewer_persons].join(',')}`)
    if (reviewer_persons.size || reviewer_teams.size) {
        await client.pulls.createReviewRequest({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: pr_number,
            reviewers: [...reviewer_persons].join(','),
            team_reviewers: [...reviewer_teams].join(','),
        });
        core.info(`Assigned individual reviews to ${reviewer_persons}.`);
        core.info(`Assigned team reviews to ${reviewer_teams}.`);
    }
    console.log(`exiting assignReviewers`)
  } catch (error) {
    core.setFailed(error.message)
    console.log("error: ",error);
  }
}

async function run(): Promise<void> {
  try {
    const core = require('@actions/core')
    const github = require('@actions/github')
    const context = github.context
    if (
      context.eventName !== 'pull_request' &&
      context.eventName !== 'pull_request_review'
    ) {
      core.setFailed(
        `Invalid event: ${context.eventName}. This action should be triggered on pull_request and pull_request_review`
      )
      return
    }
    const payload = context.payload as
      | Webhooks.PullRequestEvent
      | Webhooks.PullRequestReviewEvent

    // Read values from config file if it exists
    const config_file = fs.readFileSync(core.getInput('config-file'), 'utf8')

    // Parse contents of config file into variable
    const config_file_contents = YAML.parse(config_file)
    console.log(config_file_contents)
    console.log(config_file_contents.approvals.groups)
    const reviewer_persons = new Set()
    const reviewer_teams = new Set()
    for (const persons of config_file_contents.approvals.groups) {
      reviewer_persons.add(persons.from.person)
    }
    for (const teams of config_file_contents.approvals.groups) {
      reviewer_teams.add(teams.from.team)
    }
    // console.log(config_file_contents.approvals.groups.from)
    // const reviewer_persons_arr = [...reviewer_persons]
    // const reviewer_teams_arr = [...reviewer_teams]
    console.log(`Persons: ${reviewer_persons}`)
    for (let item of reviewer_persons) console.log(item)
    for (let item of reviewer_teams) console.log(item)

    // Get authorizations
    const token: string = core.getInput('token')
    const octokit = github.getOctokit(token)
    const client = github.getOctokit(token);
    const pr_number = payload.pull_request.number



    // Request reviews if eventName == pull_request
      //   #request_pull_request_review(repo, number, reviewers = {}, options = {}) ⇒ Sawyer::Resource
      // Create a review request

      // Examples:

      // @client.request_pull_request_review('octokit/octokit.rb', 2, reviewers: ['soudy'])
      // Parameters:

      // repo (Integer, String, Hash, Repository) — A GitHub repository
      // number (Integer) — Number ID of the pull request
      // reviewers (Hash) (defaults to: {}) — :reviewers [Array] An array of user logins
      // options (Hash) (defaults to: {}) — :team_reviewers [Array] An array of team slugs
      const rev_per = Array.from(reviewer_persons)
      console.log("Reviewer_persons")
      console.log(typeof reviewer_persons)
      console.log("rev_per")
      console.log(typeof rev_per)
      console.log(typeof rev_per[0])
    if ( context.eventName == 'pull_request' ) {
      console.log(`We are going to request someones approval!!!`)
      // assignReviewers(octokit, reviewer_persons, reviewer_teams, pr_number)
      await client.pulls.createReviewRequest({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: pr_number,
        // reviewers: rev_per
        reviewers: ['sergioko747, sergioko757'],
        // team_reviewers: [...reviewer_teams].join(','),
      });
      // await octokit.request({
      //   ...context.repo,

      // })
    } else {
      console.log(`We don't care about requesting approvals! We'll just check who already approved`)
    }

    //retrieve approvals
    const reviews = await octokit.rest.pulls.listReviews({
      ...context.repo,
      pull_number: payload.pull_request.number
    })
    const approved_users: Set<string> = new Set()
    for (const review of reviews.data) {
      if (review.state === `APPROVED`) {
        approved_users.add(review.user!.login)
        console.log(`Approval from: ${review.user!.login}`)
      }
    }

    // check approvals
    const review_gatekeeper = new ReviewGatekeeper(
      config_file_contents as Settings,
      Array.from(approved_users),
      payload.pull_request.user.login
    )

    const sha = payload.pull_request.head.sha
    console.log(`sha: ${sha}`)
    // The workflow url can be obtained by combining several environment varialbes, as described below:
    // https://docs.github.com/en/actions/reference/environment-variables#default-environment-variables
    const workflow_url = `${process.env['GITHUB_SERVER_URL']}/${process.env['GITHUB_REPOSITORY']}/actions/runs/${process.env['GITHUB_RUN_ID']}`
    console.log(`workflow_url: ${workflow_url}`)
    core.info(`Setting a status on commit (${sha})`)

    octokit.rest.repos.createCommitStatus({
      ...context.repo,
      sha,
      state: review_gatekeeper.satisfy() ? 'success' : 'failure',
      context: 'PR Gatekeeper Status2',
      target_url: workflow_url,
      description: review_gatekeeper.satisfy()
        ? undefined
        : review_gatekeeper.getMessages().join(' ').substr(0, 140)
    })

    if (!review_gatekeeper.satisfy()) {
      core.setFailed(review_gatekeeper.getMessages().join(EOL))
      return
    }
  } catch (error) {
    core.setFailed(error.message)
    console.log("error: ",error);
  }
}

run()
