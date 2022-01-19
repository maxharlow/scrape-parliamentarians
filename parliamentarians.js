import FSExtra from 'fs-extra'
import Scramjet from 'scramjet'
import Axios from 'axios'

async function fetch(request) {
    console.log(`Fetching ${request.url} ${JSON.stringify(request.params)}...`)
    const response = await Axios(request)
    return {
        data: response.data,
        passthrough: request.passthrough
    }
}

async function pages() {
    const params = {
        House: 1, // their *most recent* house, 1 is the Commons, 2 is the Lords
        IsCurrentMember: true
    }
    const response = await Axios({
        url: 'https://members-api.parliament.uk/api/Members/Search',
        params
    })
    const length = Math.ceil(response.data.totalResults / 20)
    return Array.from({ length }).map((_, i) => {
        const page = i + 1
        return {
            url: 'https://members-api.parliament.uk/api/Members/Search',
            params: {
                skip: i * 20,
                ...params
            },
            passthrough: { page }
        }
    })
}

function details(response) {
    return response.data.items.map(item => {
        return {
            name: item.value.nameDisplayAs,
            gender: item.value.gender,
            party: item.value.latestParty.name,
            membership: item.value.latestHouseMembership.membershipFrom,
            membershipHouse: item.value.latestHouseMembership.house === 1 ? 'Commons' : item.value.latestHouseMembership.house === 2 ? 'Lords' : null,
            membershipActive: item.value.latestHouseMembership.membershipStatus?.statusIsActive || false,
            membershipStartDate: item.value.latestHouseMembership.membershipStartDate,
            membershipEndDate: item.value.latestHouseMembership.membershipEndDate,
            membershipEndReason: item.value.latestHouseMembership.membershipEndReason,
            membershipEndReasonNotes: item.value.latestHouseMembership.membershipEndReasonNotes
        }
    })
}

async function run() {
    await Scramjet.DataStream.from(pages())
        .map(fetch)
        .flatMap(details)
        .CSVStringify()
        .pipe(FSExtra.createWriteStream('parliamentarians.csv'))
}

run()
