import * as core from '@actions/core'
import * as github from '@actions/github'
import * as Webhooks from '@octokit/webhooks-types'
import * as fs from 'fs'
import * as YAML from 'yaml'
import {EOL} from 'os'
import {Settings, ReviewGatekeeper} from './review_gatekeeper'
// import {SettingsRequester, ReviewRequester} from './review_requester'
// import { Collection } from 'yaml/types'



export async function assignReviewers(client: any, reviewer_persons: string[], reviewer_teams: string[], pr_number: any) {
  try {
    console.log(`entering assignReviewers`)
    console.log(`Persons: ${reviewer_persons.length}`)
    console.log(`Teams: ${reviewer_teams.length}`)
    console.log(`Persons set to string: ${[...reviewer_persons].join(',')}`)
    console.log(`Persons: ${reviewer_persons}`)
    if (reviewer_persons.length || reviewer_teams.length) {
        await client.rest.pulls.requestReviewers({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: pr_number,
            reviewers: reviewer_persons,
            // team_reviewers: [...reviewer_teams],
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

    const reviewer_persons: string[] = []
    const reviewer_teams: string[] = []
    for (const persons of config_file_contents.approvals.groups) {
      reviewer_persons.push(persons.from.person)
    }
    for (const teams of config_file_contents.approvals.groups) {
      reviewer_teams.push(teams.from.team)
    }

    // Get authorizations
    const token: string = core.getInput('token')
    const octokit = github.getOctokit(token)
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
      const reviewers_sample = ['sergioko747','sergioko757']
      console.log("Reviewer_persons")
      console.log(Array.isArray(reviewer_persons))
      console.log(reviewer_persons)
      console.log(reviewer_persons[0])
      console.log("---------")
      console.log(reviewers_sample)
      console.log(reviewer_teams)

    if ( context.eventName == 'pull_request' ) {
      console.log(`We are going to request someones approval!!!`)
      // assignReviewers(octokit, reviewer_persons, reviewer_teams, pr_number)
      await octokit.rest.pulls.requestReviewers({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: payload.pull_request.number,
        reviewers: reviewer_persons[0],
        // team_reviewers: reviewer_teams[0]
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
