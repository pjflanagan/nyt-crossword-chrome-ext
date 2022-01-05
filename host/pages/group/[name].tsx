import { useRouter } from 'next/router';

import { GroupComponent } from '../../components';
import { TimeEntry } from '../../types';

const HOST = 'http://localhost:52251' // 'https://nytcrosswordplus.flanny.app/;

export default function PageGroup({ entries }) {
  const router = useRouter()
  const { name } = router.query;

  return (
    <>
      <GroupComponent name={name as string} entries={entries as TimeEntry[]} />
    </>
  );
}

export async function getServerSideProps({ params }) {
  const { name } = params;

  const url = encodeURI(`${HOST}/.netlify/functions/readGroupTimes?groupName=${name}`);
  const resp = await fetch(url);
  let { entries, errorMessage } = await resp.json();

  if (errorMessage && errorMessage !== '') {
    console.error(errorMessage);
    entries = [];
  }

  return {
    props: {
      entries
    }
  }
}