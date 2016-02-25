const Highland = require('highland')
const Request = require('request')
const FS = require('fs')
const CSVWriter = require('csv-write-stream')

const http = Highland.wrapCallback((location, callback) => {
    Request.defaults({ headers: { 'Accept': 'application/json' } })(location, (error, response) => {
        const failure = error ? error : (response.statusCode >= 400) ? new Error(response.statusCode) : null
        callback(failure, response)
    })
})

const location = 'http://data.parliament.uk/membersdataplatform/services/mnis/members/query/membership=all'

function unwrap(response) {
    return JSON.parse(response.body.substring(1)).Members.Member
}

function format(member) {
    return {
        memberId: member['@Member_Id'],
        dodsId: member['@Dods_Id'],
        pimsId: member['@Pims_Id'],
        name: member.DisplayAs,
        nameListed: member.ListAs,
        nameInFull: member.FullTitle,
        gender: member.Gender,
        dateOfBirth: typeof member.DateOfBirth !== 'object' ? member.DateOfBirth : null,
        dateOfDeath: typeof member.DateOfDeath !== 'object' ? member.DateOfDeath : null,
        house: member.House,
        houseStartDate: typeof member.HouseStartDate !== 'object' ? member.HouseStartDate : null,
        houseEndDate: typeof member.HouseEndDate !== 'object' ? member.HouseEndDate : null,
        partyId: member.Party ? member.Party['@Id'] : null,
        party: member.Party ? member.Party['#text'] : null,
        from: member.MemberFrom,
        layingMinisterName: member.LayingMinisterName,
        state: member.CurrentStatus.Name,
        stateIsActive: member.CurrentStatus['@IsActive'] === 'True',
        stateReason: member.CurrentStatus.Reason,
        stateStartDate: typeof member.CurrentStatus.StartDate !== 'object' ? member.CurrentStatus.StartDate : null
    }
}

Highland([location])
    .flatMap(http)
    .flatMap(unwrap)
    .map(format)
    .errors(e => console.log(e.stack))
    .through(CSVWriter())
    .pipe(FS.createWriteStream('members-and-lords.csv'))
