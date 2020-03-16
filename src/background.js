/* global chrome, fetch */
const createNotification = (data) => new Promise((resolve, reject) => chrome.notifications.create('', data, () => resolve()))
const getCookie = (url, name) => new Promise((resolve, reject) => chrome.cookies.get({ url, name }, (cookie) => resolve(cookie)))
const getPostData = (post) => {
  const linkElement = post.getElementsByClassName('post-title')[0].getElementsByTagName('a')[0]
  return {
    imageLink: post.getElementsByClassName('feat-image')[0].getElementsByTagName('img')[0].src,
    link: linkElement.href,
    title: linkElement.innerText,
    text: post.getElementsByClassName('post-body')[0].getElementsByTagName('p')[0].innerText
  }
}
const setBadgeText = (text) => new Promise((resolve, reject) => chrome.browserAction.setBadgeText({ text }, () => resolve(true)))
const setCookie = (url, name, value) => new Promise((resolve, reject) => chrome.cookies.set({ url, name, value }, () => resolve(true)))

const getData = async () => {
  let currentNews = await getCookie('https://electrek.co', 'latestNews')
  if (!currentNews) {
    currentNews = '{"items": [], "new": 0, "errors": []}'
    await setCookie('https://electrek.co', 'latestNews', currentNews)
  } else {
    currentNews = currentNews.value
  }
  currentNews = JSON.parse(currentNews)
  const response = await fetch(`https://electrek.co?_=${(new Date()).valueOf()}`)
  let el = document.createElement('html')
  el.innerHTML = await response.text()
  const posts = el.getElementsByTagName('article')
  if (posts.length) {
    if (!currentNews.items.length) {
      for (let i = 0; i < 8; i++) {
        const post = posts[i]
        if (!post) {
          break
        }
        let postData = getPostData(post)
        postData.new = true
        currentNews.items.push(postData)
      }
      currentNews.new += currentNews.items.length
    } else {
      let i = 0
      const lastLink = currentNews.items[0].link
      let news = []
      while (true) {
        const post = posts[i]
        if (!post) {
          break
        }
        const postData = getPostData(post)
        if (postData.link === lastLink) {
          break
        }
        postData.new = true
        if (i < 8) {
          news.push(postData)
        }
        i++
      }
      if (news.length < 8) {
        let currentIndex = 0
        for (let i = news.length; i < 8; i++) {
          news.push(currentNews.items[currentIndex])
          currentIndex++
        }
      }
      currentNews.items = news
      currentNews.new += i
    }
  }
  if (currentNews.new > 0) {
    const lastNews = currentNews.items[0]
    await setBadgeText(currentNews > 100 ? '99+' : currentNews.new.toString())
    await createNotification({
      type: 'basic',
      iconUrl: lastNews.imageLink,
      title: 'New Electrek news article',
      message: lastNews.title,
      contextMessage: currentNews.new > 1 ? `+ ${currentNews.new - 1} other notifications` : ''
    })
  } else {
    await setBadgeText('')
  }
  await setCookie('https://electrek.co', 'latestNews', JSON.stringify(currentNews))
  return true
}

const startListener = () => {
  if (intervalActive) {
    return
  }
  intervalActive = true
  getData().then((res) => console.log((new Date()).toString(), 'success'), (err) => console.log((new Date()).toString(), err))
  setInterval(() => getData().then((res) => console.log((new Date()).toString(), 'success'), (err) => console.log((new Date()).toString(), err)), 600000)
}

let intervalActive = false

chrome.runtime.onStartup.addListener(startListener)

chrome.runtime.onInstalled.addListener(startListener)

window.onerror = async (err) => {
  console.log(err)
}
